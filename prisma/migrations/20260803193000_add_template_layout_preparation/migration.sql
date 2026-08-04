DO $$
BEGIN
  CREATE TYPE "TemplateLayoutStatus" AS ENUM ('PENDING', 'ANALYZING', 'REVIEW', 'READY', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Template"
  ADD COLUMN IF NOT EXISTS "layoutStatus" "TemplateLayoutStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "layoutConfidence" INTEGER,
  ADD COLUMN IF NOT EXISTS "layoutAnalyzedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "layoutAnalysisVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "Template"
SET "layoutStatus" = 'REVIEW'
WHERE jsonb_typeof("design") = 'array'
  AND jsonb_array_length("design") > 0
  AND "layoutStatus" = 'PENDING';

CREATE INDEX IF NOT EXISTS "Template_layoutStatus_idx" ON "Template"("layoutStatus");
