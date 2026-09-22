ALTER TABLE "Template"
  ADD COLUMN IF NOT EXISTS "supportsAi" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "canvaUrl" TEXT;

ALTER TABLE "Template"
  DROP CONSTRAINT IF EXISTS "Template_active_destination_check";

ALTER TABLE "Template"
  ADD CONSTRAINT "Template_active_destination_check"
  CHECK (NOT "isActive" OR "supportsAi" OR "canvaUrl" IS NOT NULL);

NOTIFY pgrst, 'reload schema';
