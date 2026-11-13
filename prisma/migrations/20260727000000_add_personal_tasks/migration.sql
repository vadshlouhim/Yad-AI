CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "recurrenceRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_communityId_userId_idx" ON "Task"("communityId", "userId");
CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_scheduledAt_idx" ON "Task"("scheduledAt");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task_select_own"
  ON "Task"
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = "userId");

CREATE POLICY "Task_insert_own"
  ON "Task"
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = "userId");

CREATE POLICY "Task_update_own"
  ON "Task"
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");

CREATE POLICY "Task_delete_own"
  ON "Task"
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = "userId");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Task" TO service_role;
