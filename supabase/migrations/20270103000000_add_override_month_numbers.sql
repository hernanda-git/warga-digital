-- =============================================================================
-- Explicit calendar months for house payment overrides
--
-- `credited_months` only expresses a COUNT, and the card fills months
-- sequentially from January. That cannot express "NOV + DES" or "up to
-- October" — real requests from the RT treasurer, whose shadow months follow
-- the actual payment calendar, not a January-anchored count.
--
-- Add `credited_month_numbers` (1..12) so an override names the exact months
-- it covers. `credited_months` is kept in sync (= array length) for display
-- and for the summary's full-year check.
-- =============================================================================

ALTER TABLE house_payment_overrides
  ADD COLUMN IF NOT EXISTS credited_month_numbers SMALLINT[];

-- Backfill: existing rows meant "N months from January".
UPDATE house_payment_overrides
   SET credited_month_numbers = (
         SELECT array_agg(m ORDER BY m)
           FROM generate_series(1, LEAST(GREATEST(credited_months, 1), 12)) AS m
       )
 WHERE credited_month_numbers IS NULL;

ALTER TABLE house_payment_overrides
  DROP CONSTRAINT IF EXISTS house_payment_overrides_credited_month_numbers_check;
ALTER TABLE house_payment_overrides
  ADD CONSTRAINT house_payment_overrides_credited_month_numbers_check
  CHECK (
    credited_month_numbers IS NULL
    OR (
      array_length(credited_month_numbers, 1) BETWEEN 1 AND 12
      AND credited_month_numbers <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
    )
  );

COMMENT ON COLUMN house_payment_overrides.credited_month_numbers IS
  'Exact calendar months (1=Jan..12=Dec) this override credits. Supersedes the January-anchored interpretation of credited_months, which is kept in sync as the array length.';
