ALTER TABLE "Template"
ADD COLUMN IF NOT EXISTS "originalUrl" TEXT;

ALTER TABLE "Template"
ALTER COLUMN "design" SET DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
