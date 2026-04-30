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

CREATE INDEX IF NOT EXISTS "CommunityMember_communityId_idx" ON public."CommunityMember" ("communityId");
CREATE INDEX IF NOT EXISTS "CommunityMember_email_idx" ON public."CommunityMember" (email);
CREATE INDEX IF NOT EXISTS "CommunityMember_phone_idx" ON public."CommunityMember" (phone);
CREATE INDEX IF NOT EXISTS "CommunityMember_profession_idx" ON public."CommunityMember" (profession);
