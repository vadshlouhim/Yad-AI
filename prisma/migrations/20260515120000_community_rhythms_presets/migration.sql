-- Automation presets managed from Admin global.

ALTER TABLE public."Automation"
  ADD COLUMN IF NOT EXISTS "presetId" text;

CREATE TABLE IF NOT EXISTS public."AutomationPreset" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'GENERAL',
  icon text,
  trigger public."AutomationTrigger" NOT NULL DEFAULT 'MANUAL',
  "triggerConfig" jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  "isActive" boolean NOT NULL DEFAULT true,
  "isGlobal" boolean NOT NULL DEFAULT true,
  "clientTypes" public."CommunityType"[] NOT NULL DEFAULT '{}'::public."CommunityType"[],
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Automation_presetId_fkey'
  ) THEN
    ALTER TABLE public."Automation"
      ADD CONSTRAINT "Automation_presetId_fkey"
      FOREIGN KEY ("presetId") REFERENCES public."AutomationPreset"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Automation_presetId_idx" ON public."Automation"("presetId");
CREATE INDEX IF NOT EXISTS "AutomationPreset_isActive_idx" ON public."AutomationPreset"("isActive");
CREATE INDEX IF NOT EXISTS "AutomationPreset_isGlobal_idx" ON public."AutomationPreset"("isGlobal");
CREATE INDEX IF NOT EXISTS "AutomationPreset_category_idx" ON public."AutomationPreset"(category);

INSERT INTO public."AutomationPreset" (
  id, title, description, category, icon, trigger, "triggerConfig", actions,
  "isActive", "isGlobal", "clientTypes", "sortOrder", "updatedAt"
)
VALUES
  (
    'preset_weekly_shabbat',
    'Horaires de Chabbat',
    'Prepare automatiquement les horaires de Chabbat chaque semaine.',
    'SHABBAT',
    'candle',
    'WEEKLY_SHABBAT',
    '{"day":"friday","dayOfWeek":5,"daysBefore":1,"time":"10:00"}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"SHABBAT_TIMES","channels":["INSTAGRAM","FACEBOOK","WHATSAPP"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    true,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    10,
    now()
  ),
  (
    'preset_daily_thought',
    'Pensee du jour',
    'Prepare chaque matin une pensee courte adaptee a la communaute.',
    'DAILY',
    'sparkle',
    'DAILY',
    '{"time":"09:00"}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"DAILY_CONTENT","channels":["WHATSAPP","INSTAGRAM"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    true,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    20,
    now()
  ),
  (
    'preset_weekly_course',
    'Rappel de cours',
    'Prepare un rappel hebdomadaire pour les cours reguliers.',
    'COURSE',
    'book',
    'CUSTOM_SCHEDULE',
    '{"day":"monday","time":"10:00","repeat":"weekly","days":["monday"]}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"COURSE_ANNOUNCEMENT","channels":["WHATSAPP","EMAIL"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    true,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    30,
    now()
  ),
  (
    'preset_holiday_greeting',
    'Voeux de fetes',
    'Prepare des voeux avant les prochaines fetes juives.',
    'HOLIDAY',
    'party',
    'JEWISH_HOLIDAY',
    '{"daysBeforeHoliday":3,"time":"10:00"}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"HOLIDAY_GREETING","channels":["INSTAGRAM","FACEBOOK","WHATSAPP"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    true,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    40,
    now()
  ),
  (
    'preset_donation_reminder',
    'Rappel de dons',
    'Prepare un message de collecte ou de rappel de soutien mensuel.',
    'FUNDRAISING',
    'heart',
    'CUSTOM_SCHEDULE',
    '{"day":"sunday","time":"11:00","repeat":"monthly"}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"FUNDRAISING","channels":["WHATSAPP","EMAIL"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    true,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    50,
    now()
  ),
  (
    'preset_beth_habad_farbrenguen',
    'Farbrenguen Beth Habad',
    'Prepare une annonce chaleureuse de farbrenguen ou rassemblement hassidique.',
    'COMMUNITY',
    'toast',
    'CUSTOM_SCHEDULE',
    '{"day":"thursday","time":"18:00","repeat":"none"}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"COMMUNITY_NEWS","channels":["WHATSAPP","INSTAGRAM"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    false,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    60,
    now()
  ),
  (
    'preset_sefarade_selihot',
    'Selihot / tradition sefarade',
    'Prepare une annonce adaptee aux offices, selihot ou habitudes sefarades.',
    'PRAYER',
    'prayer',
    'CUSTOM_SCHEDULE',
    '{"day":"sunday","time":"08:00","repeat":"weekly","days":["sunday"]}'::jsonb,
    '[{"type":"GENERATE_CONTENT","contentType":"COMMUNITY_NEWS","channels":["WHATSAPP","EMAIL"]},{"type":"CREATE_PUBLICATION","requiresValidation":true}]'::jsonb,
    true,
    false,
    ARRAY['SYNAGOGUE']::public."CommunityType"[],
    70,
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  trigger = EXCLUDED.trigger,
  "triggerConfig" = EXCLUDED."triggerConfig",
  actions = EXCLUDED.actions,
  "isGlobal" = EXCLUDED."isGlobal",
  "clientTypes" = EXCLUDED."clientTypes",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = now();
