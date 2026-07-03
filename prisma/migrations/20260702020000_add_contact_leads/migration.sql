CREATE TYPE "ContactLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');

CREATE TABLE "ContactLead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "organization" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'contact_form',
  "pageUrl" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "status" "ContactLeadStatus" NOT NULL DEFAULT 'NEW',
  "metadata" JSONB,
  "emailSentAt" TIMESTAMP(3),
  "emailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactLead_email_idx" ON "ContactLead"("email");
CREATE INDEX "ContactLead_status_idx" ON "ContactLead"("status");
CREATE INDEX "ContactLead_createdAt_idx" ON "ContactLead"("createdAt");
