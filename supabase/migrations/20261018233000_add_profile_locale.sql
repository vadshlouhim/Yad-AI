alter table public.profiles
add column if not exists locale text not null default 'fr'
check (locale in ('fr','he'));

-- Remove direct table writes from user sessions. Server-side service_role
-- clients keep their privileges and locale writes go through the narrow RPC.
revoke update on table public.profiles from authenticated;

create or replace function public.set_my_locale(new_locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new_locale is null or new_locale not in ('fr', 'he') then
    raise exception 'invalid locale';
  end if;

  update public.profiles
  set locale = new_locale
  where id = (select auth.uid());
end;
$$;

revoke all on function public.set_my_locale(text) from public, anon;
grant execute on function public.set_my_locale(text) to authenticated;
