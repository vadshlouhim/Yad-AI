UPDATE "PlatformSetting"
SET
  "value" = jsonb_build_object(
    'basePriceCents', 1999,
    'trialDays', 30,
    'currency', 'EUR',
    'taxLabel', 'TTC'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'billing.pricing';
