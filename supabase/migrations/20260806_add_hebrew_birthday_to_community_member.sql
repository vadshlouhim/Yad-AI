ALTER TABLE public."CommunityMember"
  ADD COLUMN IF NOT EXISTS "hebrewBirthDay" integer,
  ADD COLUMN IF NOT EXISTS "hebrewBirthMonth" integer,
  ADD COLUMN IF NOT EXISTS "hebrewBirthYear" integer;

ALTER TABLE public."CommunityMember"
  DROP CONSTRAINT IF EXISTS "CommunityMember_hebrew_birth_date_check";

ALTER TABLE public."CommunityMember"
  ADD CONSTRAINT "CommunityMember_hebrew_birth_date_check" CHECK (
    ("hebrewBirthDay" IS NULL AND "hebrewBirthMonth" IS NULL AND "hebrewBirthYear" IS NULL)
    OR
    ("hebrewBirthDay" BETWEEN 1 AND 30 AND "hebrewBirthMonth" BETWEEN 1 AND 13 AND "hebrewBirthYear" BETWEEN 3761 AND 9999)
  );

