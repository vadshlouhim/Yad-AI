begin;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on every public table';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name <> 'profiles'
      and grantee in ('anon', 'authenticated')
  ) then
    raise exception 'Browser roles must not have privileges on backend-only tables';
  end if;

  if not pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'Authenticated users must retain profile read privileges';
  end if;

  if pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'Authenticated users must not update profile columns directly';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'locale'
      and is_nullable = 'NO'
      and column_default = '''fr''::text'
  ) then
    raise exception 'profiles.locale must be required and default to fr';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.profiles'::regclass
      and constraint_record.contype = 'c'
      and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%locale%fr%he%'
  ) then
    raise exception 'profiles.locale must only accept fr or he';
  end if;

  if pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'DELETE')
    or pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
    or pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'TRIGGER') then
    raise exception 'Authenticated users must not create or delete profile rows directly';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT')
    or pg_catalog.has_table_privilege('anon', 'public.profiles', 'INSERT')
    or pg_catalog.has_table_privilege('anon', 'public.profiles', 'UPDATE')
    or pg_catalog.has_table_privilege('anon', 'public.profiles', 'DELETE') then
    raise exception 'Anonymous users must not access profiles';
  end if;

  if pg_catalog.has_function_privilege('anon', 'public.get_user_community_id()', 'EXECUTE') then
    raise exception 'Anonymous users must not execute the community helper';
  end if;

  if pg_catalog.has_function_privilege('anon', 'public.set_my_locale(text)', 'EXECUTE')
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.set_my_locale(text)',
      'EXECUTE'
    ) then
    raise exception 'Only authenticated users may execute set_my_locale';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_my_locale'
      and p.prosecdef
      and p.proconfig @> array['search_path=""']::text[]
  ) then
    raise exception 'set_my_locale must remain SECURITY DEFINER with an empty search_path';
  end if;

  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_user_community_id()',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users must retain the community helper';
  end if;

  if pg_catalog.has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    or pg_catalog.has_function_privilege(
      'authenticated',
      'public.handle_new_user()',
      'EXECUTE'
    ) then
    raise exception 'Browser roles must not invoke the auth trigger function';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and p.prosecdef
      and p.proconfig @> array['search_path=""']::text[]
  ) then
    raise exception 'The auth trigger must remain SECURITY DEFINER with an empty search_path';
  end if;
end;
$$;

rollback;
