-- Replace KANTOR with KOSONG in house_status enum

-- Step 1: Add KOSONG to the enum
ALTER TYPE house_status ADD VALUE IF NOT EXISTS 'KOSONG';

-- Step 2: Migrate existing KANTOR houses to KOSONG
UPDATE houses SET status = 'KOSONG' WHERE status = 'KANTOR';

-- Step 3: Remove KANTOR from the enum type
-- PostgreSQL doesn't support removing enum values directly,
-- so we rename the old type and create a new one without KANTOR.
ALTER TYPE house_status RENAME TO house_status_old;

CREATE TYPE house_status AS ENUM ('PRIBADI', 'KONTRAKAN', 'KOSONG');

ALTER TABLE houses
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE house_status USING status::text::house_status,
  ALTER COLUMN status SET DEFAULT 'PRIBADI';

DROP TYPE house_status_old;
