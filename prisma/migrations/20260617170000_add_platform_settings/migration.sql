CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES (
  'billing.pricing',
  '{
    "basePriceCents": 1999,
    "launchPriceCents": 999,
    "currency": "EUR",
    "taxLabel": "HT",
    "launchEndsAt": "2026-08-31",
    "launchMessage": "Offre de lancement : profitez d''EasyCom IA à 9,99 € HT par mois jusqu''à fin août 2026."
  }'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
