-- Pengeluaran Bulan Februari 2026 - Insert into kas_rt_transactions
-- Generated: 2026-04-24

INSERT INTO kas_rt_transactions (
  id,
  tenant_id,
  community_id,
  title,
  amount,
  type,
  date,
  reference,
  details,
  category,
  created_by
) VALUES
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 5100000, 'expense', '2026-02-28', 'Satpam + Sampah', 'RW + POSYANDU', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 1275000, 'expense', '2026-02-28', 'Kas RW', 'Kas RW', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 425500, 'expense', '2026-02-28', 'Kas Posyandu', 'Kas Posyandu', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 212500, 'expense', '2026-02-28', 'Kas DKM', 'Kas DKM', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 1700000, 'expense', '2026-02-28', 'Gaji Peg. Kebersihan & Kebutuhan lainnya', 'SALURAN BLK O', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 175000, 'expense', '2026-02-28', 'Konsumsi Kegiatan Warga', 'Konsumsi Kegiatan Warga', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 3750000, 'expense', '2026-02-28', 'Biaya Kegiatan Bulanan', 'GIAT NAMA JALAN', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Februari 2026', 393500, 'expense', '2026-02-28', 'Lampu Jalan', 'Lampu Jalan', 'OperasionalRT', '00000000-0000-0000-0000-000000000000');

-- Skipped records (null amount):
-- - Atk+Copy+Dasawisma
-- - Dana Sosial
-- - Biaya Bank
-- - Entertain
