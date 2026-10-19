-- À appliquer AVANT le déploiement du code du prompt 6c.
-- Cette migration est idempotente. Elle ne supprime ni modèle ni historique.

begin;

alter table public."Template"
  add column if not exists "languages" text[] not null default array['fr']::text[];

-- Normalisation défensive si la colonne avait été créée manuellement auparavant.
update public."Template"
set "languages" = array['fr']::text[]
where "languages" is null
   or cardinality("languages") = 0
   or array_position("languages", null) is not null
   or not ("languages" <@ array['fr', 'he', 'en']::text[]);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'template_languages_allowed_check'
      and conrelid = 'public."Template"'::regclass
  ) then
    alter table public."Template"
      add constraint template_languages_allowed_check
      check (
        cardinality("languages") >= 1
        and array_position("languages", null) is null
        and "languages" <@ array['fr', 'he', 'en']::text[]
      );
  end if;
end
$$;

-- Fonds Chabbat réellement réutilisés avec texte superposé.
update public."Template"
set "languages" = array['fr', 'he']::text[],
    "updatedAt" = now()
where id in (
  'template_shabbat_times_36f0b642ead8222fa0a22e3b',
  'template_shabbat_times_8c4fda2bda05634ae40abb4f',
  'template_shabbat_times_8fcf3f08eed755a0b84ff751'
)
or coalesce(tags, array[]::text[]) @> array['source:shabbat-background']::text[];

-- Masquage réversible des anciens modèles Fêtes contenant déjà du texte.
update public."Template"
set tags = array_append(coalesce(tags, array[]::text[]), 'legacy'),
    "updatedAt" = now()
where category = 'HOLIDAY'
  and coalesce(tags, array[]::text[]) @> array['usage:holiday-times']::text[]
  and not coalesce(tags, array[]::text[]) @> array['source:shabbat-background']::text[]
  and not ('legacy' = any(coalesce(tags, array[]::text[])));

create index if not exists template_languages_gin_idx
  on public."Template" using gin ("languages");

commit;

-- Vérification en lecture seule après application.
select "languages", count(*)
from public."Template"
group by "languages"
order by "languages";

select count(*) as legacy_holiday_templates
from public."Template"
where category = 'HOLIDAY'
  and coalesce(tags, array[]::text[]) @> array['usage:holiday-times', 'legacy']::text[];
