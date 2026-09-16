-- Additive: existing images keep their URLs and can be analyzed when reopened.
ALTER TABLE "MediaFile" ADD COLUMN IF NOT EXISTS "editState" JSONB;
