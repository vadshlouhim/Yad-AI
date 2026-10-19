-- EasyCom IA — mise en pause des anciennes automatisations de fêtes
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase au moment de la mise en ligne.
-- Ce script ne supprime aucune donnée et ne touche jamais aux automatisations WEEKLY_SHABBAT.

begin;

-- Met uniquement en pause les automatisations de fêtes encore actives ou planifiées.
with paused as (
  update public."Automation"
  set
    "isActive" = false,
    status = 'PAUSED',
    "nextRunAt" = null,
    "updatedAt" = now()
  where trigger = 'JEWISH_HOLIDAY'
    and (
      "isActive" is distinct from false
      or status is distinct from 'PAUSED'
      or "nextRunAt" is not null
    )
  returning id, name, "communityId", trigger, "isActive", status, "nextRunAt"
)
select
  count(*) as automatisations_fetes_mises_en_pause
from paused;

commit;

-- Vérification après exécution :
-- 1) toutes les automatisations de fêtes doivent être inactives et en pause ;
-- 2) les automatisations de Chabbat sont seulement affichées, jamais modifiées.
select
  id,
  name,
  "communityId",
  trigger,
  "isActive",
  status,
  "nextRunAt"
from public."Automation"
where trigger in ('JEWISH_HOLIDAY', 'WEEKLY_SHABBAT')
order by trigger, "communityId", name;
