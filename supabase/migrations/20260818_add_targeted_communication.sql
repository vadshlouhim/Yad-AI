-- Communication ciblée : catégories, préférences, page publique et automatisations WhatsApp.
-- À exécuter dans Supabase si cette brique n'a pas encore été créée.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."CommunityMember"
    WHERE "phone" IS NOT NULL
    GROUP BY "communityId", "phone"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration Communication ciblée bloquée : des numéros WhatsApp sont dupliqués dans le CRM.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityMember_communityId_phone_key"
  ON public."CommunityMember"("communityId", "phone");

CREATE TABLE IF NOT EXISTS public."TargetedCategory" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."TargetedSubscription" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TargetedSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."TargetedPageSettings" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayName" TEXT,
  "logoUrl" TEXT,
  "title" TEXT NOT NULL DEFAULT 'Choisissez les informations qui vous interessent',
  "introduction" TEXT NOT NULL DEFAULT 'Recevez uniquement les messages utiles, directement sur WhatsApp.',
  "primaryColor" TEXT NOT NULL DEFAULT '#421388',
  "accentColor" TEXT NOT NULL DEFAULT '#14b8a6',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedPageSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."TargetedPreferenceToken" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedPreferenceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."TargetedAutomation" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "sendTime" TEXT NOT NULL,
  "eventTime" TEXT,
  "eventName" TEXT,
  "address" TEXT,
  "link" TEXT,
  "message" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'AUTO',
  "skipYomTov" BOOLEAN NOT NULL DEFAULT true,
  "skipHolHamoed" BOOLEAN NOT NULL DEFAULT true,
  "skipSchoolHolidays" BOOLEAN NOT NULL DEFAULT true,
  "schoolZone" TEXT NOT NULL DEFAULT 'C',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedAutomation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TargetedAutomation_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "TargetedAutomation_mode_check" CHECK ("mode" IN ('AUTO', 'CONFIRM')),
  CONSTRAINT "TargetedAutomation_schoolZone_check" CHECK ("schoolZone" IN ('A', 'B', 'C'))
);

CREATE TABLE IF NOT EXISTS public."TargetedOccurrence" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "messageOverride" TEXT,
  "eventTimeOverride" TEXT,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedOccurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TargetedOccurrence_status_check" CHECK ("status" IN ('PENDING', 'AWAITING_VALIDATION', 'CANCELED', 'SENT', 'FAILED', 'SKIPPED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "TargetedCategory_communityId_name_key" ON public."TargetedCategory"("communityId", "name");
CREATE INDEX IF NOT EXISTS "TargetedCategory_communityId_sortOrder_idx" ON public."TargetedCategory"("communityId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "TargetedSubscription_categoryId_memberId_key" ON public."TargetedSubscription"("categoryId", "memberId");
CREATE INDEX IF NOT EXISTS "TargetedSubscription_memberId_idx" ON public."TargetedSubscription"("memberId");
CREATE UNIQUE INDEX IF NOT EXISTS "TargetedPageSettings_communityId_key" ON public."TargetedPageSettings"("communityId");
CREATE UNIQUE INDEX IF NOT EXISTS "TargetedPreferenceToken_memberId_key" ON public."TargetedPreferenceToken"("memberId");
CREATE UNIQUE INDEX IF NOT EXISTS "TargetedPreferenceToken_tokenHash_key" ON public."TargetedPreferenceToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "TargetedPreferenceToken_communityId_idx" ON public."TargetedPreferenceToken"("communityId");
CREATE INDEX IF NOT EXISTS "TargetedPreferenceToken_expiresAt_idx" ON public."TargetedPreferenceToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "TargetedAutomation_communityId_idx" ON public."TargetedAutomation"("communityId");
CREATE INDEX IF NOT EXISTS "TargetedAutomation_categoryId_idx" ON public."TargetedAutomation"("categoryId");
CREATE INDEX IF NOT EXISTS "TargetedAutomation_isActive_nextRunAt_idx" ON public."TargetedAutomation"("isActive", "nextRunAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TargetedOccurrence_automationId_scheduledFor_key" ON public."TargetedOccurrence"("automationId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "TargetedOccurrence_status_scheduledFor_idx" ON public."TargetedOccurrence"("status", "scheduledFor");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedCategory_communityId_fkey'
  ) THEN
    ALTER TABLE public."TargetedCategory"
      ADD CONSTRAINT "TargetedCategory_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES public."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedSubscription_categoryId_fkey'
  ) THEN
    ALTER TABLE public."TargetedSubscription"
      ADD CONSTRAINT "TargetedSubscription_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES public."TargetedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedSubscription_memberId_fkey'
  ) THEN
    ALTER TABLE public."TargetedSubscription"
      ADD CONSTRAINT "TargetedSubscription_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES public."CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedPageSettings_communityId_fkey'
  ) THEN
    ALTER TABLE public."TargetedPageSettings"
      ADD CONSTRAINT "TargetedPageSettings_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES public."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedPreferenceToken_communityId_fkey'
  ) THEN
    ALTER TABLE public."TargetedPreferenceToken"
      ADD CONSTRAINT "TargetedPreferenceToken_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES public."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedPreferenceToken_memberId_fkey'
  ) THEN
    ALTER TABLE public."TargetedPreferenceToken"
      ADD CONSTRAINT "TargetedPreferenceToken_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES public."CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedAutomation_communityId_fkey'
  ) THEN
    ALTER TABLE public."TargetedAutomation"
      ADD CONSTRAINT "TargetedAutomation_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES public."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedAutomation_categoryId_fkey'
  ) THEN
    ALTER TABLE public."TargetedAutomation"
      ADD CONSTRAINT "TargetedAutomation_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES public."TargetedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TargetedOccurrence_automationId_fkey'
  ) THEN
    ALTER TABLE public."TargetedOccurrence"
      ADD CONSTRAINT "TargetedOccurrence_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES public."TargetedAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
