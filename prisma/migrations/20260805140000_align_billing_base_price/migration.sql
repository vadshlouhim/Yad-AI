UPDATE "PlatformSetting"
SET
  "value" = jsonb_set("value", '{basePriceCents}', '2999'::jsonb, true),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "key" = 'billing.pricing'
  AND COALESCE(("value" ->> 'basePriceCents')::integer, 0) = 1999;
