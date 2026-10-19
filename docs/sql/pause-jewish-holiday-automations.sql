-- À exécuter uniquement au moment de la mise en ligne.
-- Ne supprime aucune donnée et ne touche pas aux automatisations WEEKLY_SHABBAT.
begin;

update public."Automation"
set
  "isActive" = false,
  status = 'PAUSED',
  "nextRunAt" = null,
  "updatedAt" = now()
where trigger = 'JEWISH_HOLIDAY'
  and ("isActive" is distinct from false or status is distinct from 'PAUSED' or "nextRunAt" is not null);

commit;

-- Vérification en lecture seule après exécution :
select id, "communityId", name, "isActive", status, "nextRunAt"
from public."Automation"
where trigger = 'JEWISH_HOLIDAY'
order by "communityId", "updatedAt" desc;
