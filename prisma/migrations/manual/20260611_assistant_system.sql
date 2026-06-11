-- ============================================================
-- Migration manuelle — Refonte assistant IA
-- À exécuter dans Supabase → SQL Editor (ou via psql avec un DIRECT_URL valide)
-- Idempotente : peut être relancée sans casser si déjà appliquée.
-- ============================================================

-- Note : le mode AUTO/CONFIRM de l'assistant réutilise la préférence existante
-- community.vocabulary.automationValidationMode (onboarding + paramètres).
-- Aucune colonne supplémentaire nécessaire.

-- 1. Enums ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. PendingAction : actions en attente de validation ---------
CREATE TABLE IF NOT EXISTS "PendingAction" (
  "id"          TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "userId"      UUID,
  "kind"        TEXT NOT NULL,
  "summary"     TEXT NOT NULL,
  "payload"     JSONB NOT NULL,
  "status"      "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
  "token"       TEXT NOT NULL,
  "source"      TEXT NOT NULL DEFAULT 'chat',
  "resolvedAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingAction_token_key"   ON "PendingAction"("token");
CREATE INDEX IF NOT EXISTS "PendingAction_communityId_idx"    ON "PendingAction"("communityId");
CREATE INDEX IF NOT EXISTS "PendingAction_userId_idx"         ON "PendingAction"("userId");
CREATE INDEX IF NOT EXISTS "PendingAction_status_idx"         ON "PendingAction"("status");
CREATE INDEX IF NOT EXISTS "PendingAction_token_idx"          ON "PendingAction"("token");

DO $$ BEGIN
  ALTER TABLE "PendingAction"
    ADD CONSTRAINT "PendingAction_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "PendingAction"
    ADD CONSTRAINT "PendingAction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. PushSubscription : abonnements push web (VAPID) ----------
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"        TEXT NOT NULL,
  "userId"    UUID NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"          ON "PushSubscription"("userId");

DO $$ BEGIN
  ALTER TABLE "PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
