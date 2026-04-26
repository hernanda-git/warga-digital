-- Pengeluaran Bulan Maret 2026 - Insert into kas_rt_transactions
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
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 5100000, 'expense', '2026-03-31', 'Satpam + Sampah', 'Satpam + Sampah', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 1275000, 'expense', '2026-03-31', 'Kas RW', 'Kas RW', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 212500, 'expense', '2026-03-31', 'Kas Posyandu', 'Kas Posyandu', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 212500, 'expense', '2026-03-31', 'Kas DKM', 'Kas DKM', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 1250000, 'expense', '2026-03-31', 'Gaji Peg. Kebersihan & Kebutuhan lainnya', 'beli bensin 50 ribu', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 214000, 'expense', '2026-03-31', 'Atk+Copy+Dasawisma', 'Atk+Copy+Dasawisma', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 350000, 'expense', '2026-03-31', 'Lampu Jalan', 'Lampu Jalan', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Maret 2026', 250000, 'expense', '2026-03-31', 'Dana Sosial', 'Dana Sosial', 'Lain-Lain', '00000000-0000-0000-0000-000000000000');

-- Skipped records (null amount):
-- - Konsumsi Kegiatan Warga
-- - Biaya Kegiatan Bulanan
-- - Biaya Bank
-- - Entertain
