-- Community marketplace: private resources, free sharing, and peer-to-peer listings.
-- All access stays behind authenticated Next.js route handlers using service_role.

create table if not exists public.community_seller_profiles (
  "userId" uuid primary key references public.profiles(id) on delete cascade,
  "displayName" text not null,
  city text,
  "contactType" text not null check ("contactType" in ('email', 'whatsapp')),
  "contactValue" text not null,
  "paymentProvider" text check ("paymentProvider" in ('paypal', 'revolut')),
  "paymentUrl" text,
  "termsAcceptedAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint community_seller_profiles_payment_url_https
    check ("paymentUrl" is null or "paymentUrl" ~ '^https://'),
  constraint community_seller_profiles_payment_pair
    check (("paymentProvider" is null) = ("paymentUrl" is null))
);

create table if not exists public.community_listings (
  id text primary key default gen_random_uuid()::text,
  "ownerUserId" uuid references public.profiles(id) on delete set null,
  "communityId" text not null references public."Community"(id) on delete cascade,
  "legacyResourceId" text unique,
  kind text not null check (kind in ('digital', 'physical')),
  access text not null check (access in ('personal', 'free', 'paid')),
  visibility text not null check (visibility in ('owner', 'community', 'platform')),
  status text not null default 'published'
    check (status in ('draft', 'published', 'hidden', 'reported', 'sold', 'archived')),
  title text not null,
  description text not null,
  category text not null check (category in (
    'books_texts',
    'prayer_study',
    'shabbat_holidays',
    'judaica_objects',
    'children_family',
    'community_communication',
    'other'
  )),
  theme text,
  keywords text[] not null default '{}',
  "priceCents" integer,
  currency text not null default 'EUR',
  condition text check (condition in ('new', 'very_good', 'good', 'fair')),
  "fulfillmentMode" text check ("fulfillmentMode" in ('pickup', 'shipping', 'both')),
  city text,
  "shippingNote" text,
  "publishedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint community_listings_access_visibility_check check (
    (access = 'personal' and visibility = 'owner' and kind = 'digital' and "priceCents" is null)
    or (access = 'free' and visibility in ('community', 'platform') and "priceCents" is null)
    or (access = 'paid' and visibility in ('community', 'platform') and "priceCents" > 0)
  ),
  constraint community_listings_physical_fields_check check (
    kind = 'digital'
    or (condition is not null and "fulfillmentMode" is not null and city is not null)
  )
);

create table if not exists public.community_listing_assets (
  id text primary key default gen_random_uuid()::text,
  "listingId" text not null references public.community_listings(id) on delete cascade,
  role text not null check (role in ('cover', 'gallery', 'digital_file')),
  "storagePath" text not null,
  "mimeType" text not null,
  "fileSize" integer not null check ("fileSize" > 0),
  "sortOrder" integer not null default 0 check ("sortOrder" >= 0),
  "createdAt" timestamptz not null default now()
);

create table if not exists public.community_listing_favorites (
  "listingId" text not null references public.community_listings(id) on delete cascade,
  "userId" uuid not null references public.profiles(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  primary key ("listingId", "userId")
);

create table if not exists public.community_listing_views (
  "listingId" text not null references public.community_listings(id) on delete cascade,
  "userId" uuid not null references public.profiles(id) on delete cascade,
  "firstViewedAt" timestamptz not null default now(),
  "lastViewedAt" timestamptz not null default now(),
  primary key ("listingId", "userId")
);

create table if not exists public.community_listing_reports (
  id text primary key default gen_random_uuid()::text,
  "listingId" text not null references public.community_listings(id) on delete cascade,
  "reporterUserId" uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('prohibited', 'fraud', 'copyright', 'incorrect', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("listingId", "reporterUserId")
);

create index if not exists community_listings_owner_idx
  on public.community_listings ("ownerUserId", "createdAt" desc);
create index if not exists community_listings_community_feed_idx
  on public.community_listings ("communityId", status, "publishedAt" desc, id desc)
  where visibility = 'community';
create index if not exists community_listings_platform_feed_idx
  on public.community_listings (status, "publishedAt" desc, id desc)
  where visibility = 'platform';
create index if not exists community_listings_filter_idx
  on public.community_listings (kind, access, category, status);
create index if not exists community_listing_assets_listing_idx
  on public.community_listing_assets ("listingId", "sortOrder");
create index if not exists community_listing_favorites_user_idx
  on public.community_listing_favorites ("userId", "createdAt" desc);
create index if not exists community_listing_views_user_idx
  on public.community_listing_views ("userId");
create index if not exists community_listing_reports_status_idx
  on public.community_listing_reports (status, "createdAt" desc);

alter table public.community_seller_profiles enable row level security;
alter table public.community_listings enable row level security;
alter table public.community_listing_assets enable row level security;
alter table public.community_listing_favorites enable row level security;
alter table public.community_listing_views enable row level security;
alter table public.community_listing_reports enable row level security;

revoke all privileges on table public.community_seller_profiles from anon, authenticated;
revoke all privileges on table public.community_listings from anon, authenticated;
revoke all privileges on table public.community_listing_assets from anon, authenticated;
revoke all privileges on table public.community_listing_favorites from anon, authenticated;
revoke all privileges on table public.community_listing_views from anon, authenticated;
revoke all privileges on table public.community_listing_reports from anon, authenticated;

grant all privileges on table public.community_seller_profiles to service_role;
grant all privileges on table public.community_listings to service_role;
grant all privileges on table public.community_listing_assets to service_role;
grant all privileges on table public.community_listing_favorites to service_role;
grant all privileges on table public.community_listing_views to service_role;
grant all privileges on table public.community_listing_reports to service_role;

create policy "Backend service role only" on public.community_seller_profiles
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public.community_listings
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public.community_listing_assets
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public.community_listing_favorites
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public.community_listing_views
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public.community_listing_reports
  for all to service_role using (true) with check (true);

-- Preserve the existing shared resources as free community listings.
insert into public.community_listings (
  id,
  "ownerUserId",
  "communityId",
  "legacyResourceId",
  kind,
  access,
  visibility,
  status,
  title,
  description,
  category,
  theme,
  keywords,
  "publishedAt",
  "createdAt",
  "updatedAt"
)
select
  id,
  null,
  "communityId",
  id,
  'digital',
  'free',
  'community',
  case when status = 'published' then 'published' else 'hidden' end,
  title,
  description,
  case
    when category = 'Cours' then 'prayer_study'
    when category in ('Affiche', 'Lettre', 'Texte WhatsApp') then 'community_communication'
    else 'other'
  end,
  theme,
  keywords,
  "createdAt",
  "createdAt",
  "updatedAt"
from public.community_resources
on conflict (id) do nothing;

insert into public.community_listing_assets (
  "listingId",
  role,
  "storagePath",
  "mimeType",
  "fileSize",
  "sortOrder"
)
select
  id,
  'digital_file',
  split_part("fileUrl", '/community-library/', 2),
  case "fileType"
    when 'pdf' then 'application/pdf'
    when 'image' then 'image/jpeg'
    else 'text/plain'
  end,
  "fileSize",
  0
from public.community_resources
where "fileUrl" like '%/community-library/%'
  and "fileSize" > 0
on conflict do nothing;

-- The marketplace bucket is private. Downloads are issued as short-lived signed URLs by the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-library',
  'community-library',
  false,
  15728640,
  array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read community-library" on storage.objects;
drop policy if exists "Authenticated upload community-library" on storage.objects;
