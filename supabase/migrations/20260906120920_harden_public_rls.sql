-- Keep all application data access behind the trusted server clients. The web
-- application uses service_role/Prisma for these tables; browser sessions only
-- access their own row in public.profiles.
do $$
declare
  table_name text;
  backend_only_tables constant text[] := array[
    'AIMemory',
    'Article',
    'AuditLog',
    'Automation',
    'AutomationRun',
    'BlogArticle',
    'Channel',
    'ChannelAdaptation',
    'Community',
    'CommunityMember',
    'ContactLead',
    'ContentDraft',
    'Conversation',
    'ConversationMessage',
    'Event',
    'FranceCityShabbatSchedule',
    'HebrewCalendarReference',
    'MediaFile',
    'Notification',
    'PendingAction',
    'Publication',
    'PushSubscription',
    'RecurringContent',
    'Subscription',
    'TargetedAutomation',
    'TargetedCategory',
    'TargetedOccurrence',
    'TargetedPageSettings',
    'TargetedPreferenceToken',
    'TargetedSubscription',
    'Template',
    'community_resource_requests',
    'community_resources',
    'donation_campaign_ai_sessions',
    'donation_campaign_assets',
    'donation_campaign_steps',
    'donation_campaigns'
  ];
begin
  foreach table_name in array backend_only_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'Backend service role only', table_name);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      'Backend service role only',
      table_name
    );
  end loop;
end
$$;

-- Session-bound profile access is the only direct Data API access used by the
-- application. Remove the legacy broad grants before adding back the minimum.
alter table public.profiles enable row level security;
revoke all privileges on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- This helper does not need elevated privileges: the profiles policy already
-- limits it to the caller's row.
create or replace function public.get_user_community_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select p."communityId"
  from public.profiles as p
  where p.id = (select auth.uid());
$$;

revoke all on function public.get_user_community_id() from public, anon;
grant execute on function public.get_user_community_id() to authenticated, service_role;

-- The auth trigger must remain SECURITY DEFINER so signup can create the
-- profile, but it must not be callable through PostgREST RPC.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, "avatarUrl", role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'ADMIN',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, profiles.name),
    "avatarUrl" = coalesce(excluded."avatarUrl", profiles."avatarUrl"),
    "updatedAt" = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;

-- Preserve the existing public downloads and authenticated uploads while using
-- explicit roles instead of the deprecated auth.role() predicate.
drop policy if exists "Public read templates" on storage.objects;
create policy "Public read templates"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'templates');

drop policy if exists "Authenticated upload templates" on storage.objects;
create policy "Authenticated upload templates"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'templates');

drop policy if exists "Public read community-library" on storage.objects;
create policy "Public read community-library"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'community-library');

drop policy if exists "Authenticated upload community-library" on storage.objects;
create policy "Authenticated upload community-library"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'community-library');
