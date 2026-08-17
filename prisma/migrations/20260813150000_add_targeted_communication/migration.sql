-- Communication ciblee: categories, preferences, page publique et automatisations WhatsApp.

-- Le CRM normalise deja les numeros avant ecriture. Cette contrainte garantit
-- qu'une communaute ne peut pas contenir deux fiches avec le meme numero.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CommunityMember"
    WHERE "phone" IS NOT NULL
    GROUP BY "communityId", "phone"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration Communication ciblee bloquee : des numeros WhatsApp sont dupliques dans le CRM.';
  END IF;
END $$;

CREATE UNIQUE INDEX "CommunityMember_communityId_phone_key"
  ON "CommunityMember"("communityId", "phone");

CREATE TABLE "TargetedCategory" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TargetedSubscription" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TargetedSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TargetedPageSettings" (
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

CREATE TABLE "TargetedPreferenceToken" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TargetedPreferenceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TargetedAutomation" (
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

CREATE TABLE "TargetedOccurrence" (
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

CREATE UNIQUE INDEX "TargetedCategory_communityId_name_key" ON "TargetedCategory"("communityId", "name");
CREATE INDEX "TargetedCategory_communityId_sortOrder_idx" ON "TargetedCategory"("communityId", "sortOrder");
CREATE UNIQUE INDEX "TargetedSubscription_categoryId_memberId_key" ON "TargetedSubscription"("categoryId", "memberId");
CREATE INDEX "TargetedSubscription_memberId_idx" ON "TargetedSubscription"("memberId");
CREATE UNIQUE INDEX "TargetedPageSettings_communityId_key" ON "TargetedPageSettings"("communityId");
CREATE UNIQUE INDEX "TargetedPreferenceToken_memberId_key" ON "TargetedPreferenceToken"("memberId");
CREATE UNIQUE INDEX "TargetedPreferenceToken_tokenHash_key" ON "TargetedPreferenceToken"("tokenHash");
CREATE INDEX "TargetedPreferenceToken_communityId_idx" ON "TargetedPreferenceToken"("communityId");
CREATE INDEX "TargetedPreferenceToken_expiresAt_idx" ON "TargetedPreferenceToken"("expiresAt");
CREATE INDEX "TargetedAutomation_communityId_idx" ON "TargetedAutomation"("communityId");
CREATE INDEX "TargetedAutomation_categoryId_idx" ON "TargetedAutomation"("categoryId");
CREATE INDEX "TargetedAutomation_isActive_nextRunAt_idx" ON "TargetedAutomation"("isActive", "nextRunAt");
CREATE UNIQUE INDEX "TargetedOccurrence_automationId_scheduledFor_key" ON "TargetedOccurrence"("automationId", "scheduledFor");
CREATE INDEX "TargetedOccurrence_status_scheduledFor_idx" ON "TargetedOccurrence"("status", "scheduledFor");

ALTER TABLE "TargetedCategory" ADD CONSTRAINT "TargetedCategory_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedSubscription" ADD CONSTRAINT "TargetedSubscription_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "TargetedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedSubscription" ADD CONSTRAINT "TargetedSubscription_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedPageSettings" ADD CONSTRAINT "TargetedPageSettings_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedPreferenceToken" ADD CONSTRAINT "TargetedPreferenceToken_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedPreferenceToken" ADD CONSTRAINT "TargetedPreferenceToken_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedAutomation" ADD CONSTRAINT "TargetedAutomation_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedAutomation" ADD CONSTRAINT "TargetedAutomation_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "TargetedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TargetedOccurrence" ADD CONSTRAINT "TargetedOccurrence_automationId_fkey"
  FOREIGN KEY ("automationId") REFERENCES "TargetedAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
