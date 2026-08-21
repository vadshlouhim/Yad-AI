-- ============================================================
-- Yad.ia — Bootstrap Supabase
-- À exécuter dans Supabase SQL Editor après avoir créé le projet
-- ============================================================

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour la recherche full-text

-- 2. Trigger pour créer automatiquement le profil lors d'un signup Supabase
-- Ce trigger synchronise auth.users → public.profiles (= table User de Prisma)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, "avatarUrl", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'ADMIN',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    "avatarUrl" = COALESCE(EXCLUDED."avatarUrl", profiles."avatarUrl"),
    "updatedAt" = NOW();

  RETURN NEW;
END;
$$;

-- Attacher le trigger à auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security (RLS)

-- Activer RLS sur les tables sensibles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs ne peuvent voir que leur propre profil
-- (Les admins super_admin peuvent tout voir — à gérer via service role)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Index de recherche full-text pour les événements
-- (En complément des index Prisma)
-- NOTE: Ces index seront créés par Prisma migrate, mais on peut en ajouter ici pour la recherche

-- 5. Bucket Storage pour les templates d'affiches
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10 Mo
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : lecture publique des templates
CREATE POLICY "Public read templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- Politique : upload réservé aux utilisateurs authentifiés
CREATE POLICY "Authenticated upload templates" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'templates' AND auth.role() = 'authenticated');

-- 6. Fonction utilitaire : obtenir la communauté de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_community_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT "communityId" FROM public.profiles WHERE id = auth.uid();
$$;

-- 7. Contacts / membres de communauté
CREATE TABLE IF NOT EXISTS public."CommunityMember" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  "firstName" text,
  "lastName" text,
  "displayName" text NOT NULL,
  email text,
  phone text,
  profession text,
  age integer,
  "birthDate" date,
  "hebrewBirthDay" integer,
  "hebrewBirthMonth" integer,
  "hebrewBirthYear" integer,
  address text,
  city text,
  "familyStatus" text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  tags text[] NOT NULL DEFAULT '{}',
  "optInEmail" boolean NOT NULL DEFAULT true,
  "optInWhatsapp" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."CommunityMember"
  DROP CONSTRAINT IF EXISTS "CommunityMember_hebrew_birth_date_check";
ALTER TABLE public."CommunityMember"
  ADD CONSTRAINT "CommunityMember_hebrew_birth_date_check" CHECK (
    ("hebrewBirthDay" IS NULL AND "hebrewBirthMonth" IS NULL AND "hebrewBirthYear" IS NULL)
    OR
    ("hebrewBirthDay" BETWEEN 1 AND 30 AND "hebrewBirthMonth" BETWEEN 1 AND 13 AND "hebrewBirthYear" BETWEEN 3761 AND 9999)
  );


CREATE INDEX IF NOT EXISTS "CommunityMember_communityId_idx" ON public."CommunityMember" ("communityId");
CREATE INDEX IF NOT EXISTS "CommunityMember_email_idx" ON public."CommunityMember" (email);
CREATE INDEX IF NOT EXISTS "CommunityMember_phone_idx" ON public."CommunityMember" (phone);
CREATE INDEX IF NOT EXISTS "CommunityMember_profession_idx" ON public."CommunityMember" (profession);

-- 8. Bibliothèque communautaire intelligente

-- Ressources partagées au sein d'une communauté
CREATE TABLE IF NOT EXISTS public.community_resources (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cours', 'Affiche', 'Lettre', 'Texte WhatsApp')),
  theme text NOT NULL CHECK (theme IN ('Chabbat', 'Fêtes juives', 'Torah', 'Jeunesse', 'Famille', 'Communauté', 'Campagne de dons', 'Événements')),
  keywords text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'fr',
  "fileUrl" text NOT NULL,
  "fileType" text NOT NULL CHECK ("fileType" IN ('pdf', 'image', 'text')),
  "fileSize" integer NOT NULL,
  "thumbnailUrl" text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'reported')),
  "isFeatured" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_resources_community_idx ON public.community_resources ("communityId");
CREATE INDEX IF NOT EXISTS community_resources_status_idx ON public.community_resources (status);
CREATE INDEX IF NOT EXISTS community_resources_category_idx ON public.community_resources (category);
CREATE INDEX IF NOT EXISTS community_resources_theme_idx ON public.community_resources (theme);

ALTER TABLE public.community_resources ENABLE ROW LEVEL SECURITY;

-- Demandes de ressources au sein d'une communauté
CREATE TABLE IF NOT EXISTS public.community_resource_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cours', 'Affiche', 'Lettre', 'Texte WhatsApp')),
  theme text NOT NULL CHECK (theme IN ('Chabbat', 'Fêtes juives', 'Torah', 'Jeunesse', 'Famille', 'Communauté', 'Campagne de dons', 'Événements')),
  urgency text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'closed')),
  "aiRefined" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_resource_requests_community_idx ON public.community_resource_requests ("communityId");
CREATE INDEX IF NOT EXISTS community_resource_requests_status_idx ON public.community_resource_requests (status);

ALTER TABLE public.community_resource_requests ENABLE ROW LEVEL SECURITY;

-- Bucket Storage pour les fichiers de la bibliothèque communautaire
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-library',
  'community-library',
  true,
  15728640, -- 15 Mo
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : lecture publique des fichiers de la bibliothèque
CREATE POLICY "Public read community-library" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-library');

-- Politique : upload réservé aux utilisateurs authentifiés
CREATE POLICY "Authenticated upload community-library" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'community-library' AND auth.role() = 'authenticated');

-- 9. Campagne de dons

-- Lien de dons public de la communaute (utilise notamment dans le feuillet Chabbat).
ALTER TABLE public."Community" ADD COLUMN IF NOT EXISTS "donationUrl" text;

CREATE TABLE IF NOT EXISTS public.donation_campaigns (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  title text NOT NULL,
  slogan text,
  theme text,
  cause text,
  tone text,
  objective_amount numeric,
  collected_amount numeric,
  donation_url text,
  organization_name text,
  rabbi_name text,
  channels text[] NOT NULL DEFAULT '{}',
  publication_mode text NOT NULL DEFAULT 'after_validation' CHECK (publication_mode IN ('after_validation', 'automatic')),
  email_enabled boolean NOT NULL DEFAULT false,
  sms_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_validation', 'active', 'paused', 'completed')),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donation_campaign_steps (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id text NOT NULL REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  step_date date NOT NULL,
  step_label text NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('launch', 'reminder', 'relay', 'final_push', 'closing', 'thank_you')),
  selected_channels text[] NOT NULL DEFAULT '{}',
  visual_type text NOT NULL DEFAULT 'square_poster',
  status text NOT NULL DEFAULT 'to_prepare' CHECK (status IN ('to_prepare', 'ready', 'to_validate', 'scheduled', 'published')),
  requires_validation boolean NOT NULL DEFAULT true,
  scheduled_publish_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donation_campaign_assets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id text NOT NULL REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
  step_id text REFERENCES public.donation_campaign_steps(id) ON DELETE SET NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('square_poster', 'banner', 'whatsapp_text', 'sms_text', 'email_content', 'social_post')),
  format text,
  title text NOT NULL,
  thumbnail_url text,
  full_asset_url text,
  text_content text,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'validated', 'to_correct', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donation_campaign_ai_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id text NOT NULL REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
  "communityId" text NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  conversation_payload jsonb,
  generated_plan jsonb,
  generated_slogans text[] DEFAULT '{}',
  generated_theme text,
  generated_assets jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS donation_campaigns_community_idx ON public.donation_campaigns ("communityId");
CREATE INDEX IF NOT EXISTS donation_campaigns_status_idx ON public.donation_campaigns (status);
CREATE INDEX IF NOT EXISTS donation_campaign_steps_campaign_idx ON public.donation_campaign_steps (campaign_id);
CREATE INDEX IF NOT EXISTS donation_campaign_steps_date_idx ON public.donation_campaign_steps (step_date);
CREATE INDEX IF NOT EXISTS donation_campaign_assets_campaign_idx ON public.donation_campaign_assets (campaign_id);
CREATE INDEX IF NOT EXISTS donation_campaign_ai_sessions_campaign_idx ON public.donation_campaign_ai_sessions (campaign_id);

-- RLS
ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaign_ai_sessions ENABLE ROW LEVEL SECURITY;
