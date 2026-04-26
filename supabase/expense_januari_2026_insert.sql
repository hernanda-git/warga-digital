-- Pengeluaran Bulan Januari 2026 - Insert into kas_rt_transactions
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
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 5100000, 'expense', '2026-01-31', 'Satpam + Sampah', 'Satpam + Sampah', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 1275000, 'expense', '2026-01-31', 'Kas RW', 'Kas RW', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 212500, 'expense', '2026-01-31', 'Kas Posyandu', 'Kas Posyandu', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 212500, 'expense', '2026-01-31', 'Kas DKM', 'Kas DKM', 'OperasionalRW', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 1200000, 'expense', '2026-01-31', 'Gaji Peg. Kebersihan & Kebutuhan lain nya', 'Gaji Peg. Kebersihan & Kebutuhan lain nya', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 305000, 'expense', '2026-01-31', 'Konsumsi Kegiatan Warga', 'Konsumsi Kegiatan Warga', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 2009000, 'expense', '2026-01-31', 'Kegiatan Pemerintahan/Keagamaan', 'GIAT PEMILIHAN RT', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 735000, 'expense', '2026-01-31', 'Lampu Jalan', 'Lampu Jalan', 'OperasionalRT', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Pengeluaran Januari 2026', 6500, 'expense', '2026-01-31', 'Biaya Bank', 'Biaya Tranfer Operatisonal RW', 'Lain-Lain', '00000000-0000-0000-0000-000000000000');

-- Skipped records (null amount):
-- - Atk+Copy+Dasawisma
-- - Biaya Kegiatan Bulanan
-- - Dana Sosial
