alter table public."CommunityMember"
  add column if not exists "birthAfterSunset" boolean not null default false,
  add column if not exists "hebrewFirstName" text,
  add column if not exists "hebrewFatherName" text,
  add column if not exists "hebrewMotherName" text,
  add column if not exists "externalSource" text,
  add column if not exists "externalId" text;

create unique index if not exists "CommunityMember_communityId_externalSource_externalId_key"
  on public."CommunityMember" ("communityId", "externalSource", "externalId");

create table if not exists public."CommunityIntegration" (
  id text primary key,
  "communityId" text not null references public."Community"(id) on delete cascade,
  provider text not null,
  "encryptedSecret" text not null,
  "isActive" boolean not null default true,
  "lastSyncAt" timestamptz,
  "lastSyncStatus" text,
  "lastSyncError" text,
  "lastSyncReport" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "CommunityIntegration_provider_check" check (provider in ('UNISOFT')),
  constraint "CommunityIntegration_communityId_provider_key" unique ("communityId", provider)
);

create index if not exists "CommunityIntegration_communityId_idx"
  on public."CommunityIntegration" ("communityId");

create table if not exists public."MemberYahrzeit" (
  id text primary key,
  "communityId" text not null references public."Community"(id) on delete cascade,
  "memberId" text not null references public."CommunityMember"(id) on delete cascade,
  "deceasedName" text not null,
  "deceasedHebrewName" text,
  relationship text,
  "fatherHebrewName" text,
  "motherHebrewName" text,
  "deathDate" timestamptz,
  "deathAfterSunset" boolean not null default false,
  "hebrewDeathDay" integer not null,
  "hebrewDeathMonth" integer not null,
  "hebrewDeathYear" integer not null,
  notes text,
  "isActive" boolean not null default true,
  "externalSource" text,
  "externalId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MemberYahrzeit_hebrew_day_check" check ("hebrewDeathDay" between 1 and 30),
  constraint "MemberYahrzeit_hebrew_month_check" check ("hebrewDeathMonth" between 1 and 13),
  constraint "MemberYahrzeit_hebrew_year_check" check ("hebrewDeathYear" between 3761 and 9999),
  constraint "MemberYahrzeit_community_member_external_key" unique ("communityId", "memberId", "externalSource", "externalId")
);

create index if not exists "MemberYahrzeit_communityId_isActive_idx"
  on public."MemberYahrzeit" ("communityId", "isActive");
create index if not exists "MemberYahrzeit_memberId_idx"
  on public."MemberYahrzeit" ("memberId");
create index if not exists "MemberYahrzeit_communityId_hebrewDeathMonth_hebrewDeathDay_idx"
  on public."MemberYahrzeit" ("communityId", "hebrewDeathMonth", "hebrewDeathDay");

alter table public."CommunityIntegration" enable row level security;
alter table public."MemberYahrzeit" enable row level security;
revoke all privileges on table public."CommunityIntegration", public."MemberYahrzeit" from anon, authenticated;

create policy "Backend service role only" on public."CommunityIntegration"
  for all to service_role using (true) with check (true);
create policy "Backend service role only" on public."MemberYahrzeit"
  for all to service_role using (true) with check (true);
