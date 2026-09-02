UPDATE "PlatformSetting"
SET
  "value" = jsonb_set(
    jsonb_set("value", '{basePriceCents}', '1999'::jsonb, true),
    '{launchPriceCents}',
    '999'::jsonb,
    true
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'billing.pricing';
