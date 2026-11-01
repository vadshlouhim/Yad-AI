-- Channel adaptations are inserted through the Supabase Data API, where
-- Prisma's client-side cuid() default is not applied. Give Postgres its own
-- default so every publishing flow can create an adaptation reliably.
alter table public."ChannelAdaptation"
  alter column "id" set default (gen_random_uuid()::text);
