-- SQL script to generate INSERT statements for kas_rt_transactions from expense data
-- This script inserts expense transactions with appropriate metadata
-- Data source: expense data provided by user
-- Year: 2026

INSERT INTO kas_rt_transactions (
    type,
    title,
    details,
    amount,
    date,
    created_by,
    tenant_id,
    community_id,
    reference
) VALUES
-- Iuran Rw
('expense', 'Iuran Rw', 'Iuran rutin warga untuk operasional RW.', 6806500, '2026-01-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Iuran Rw'),
('expense', 'Iuran Rw', 'Iuran RW termasuk kontribusi kegiatan Posyandu.', 7013000, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Iuran Rw'),
('expense', 'Iuran Rw', 'Iuran rutin warga untuk operasional RW.', 6800000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Iuran Rw'),
-- Tukang Rumput
('expense', 'Tukang Rumput', 'Biaya jasa pemotongan rumput dan perawatan lingkungan.', 1200000, '2026-01-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Tukang Rumput'),
('expense', 'Tukang Rumput', 'Biaya jasa pemotongan rumput dan perawatan lingkungan.', 1200000, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Tukang Rumput'),
('expense', 'Tukang Rumput', 'Biaya jasa pemotongan rumput dan perawatan lingkungan.', 1200000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Tukang Rumput'),
-- Entertain/Konsumsi Rapat
('expense', 'Entertain/Konsumsi Rapat', 'Konsumsi dan kebutuhan rapat warga.', 305000, '2026-01-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Entertain/Konsumsi Rapat'),
('expense', 'Entertain/Konsumsi Rapat', 'Konsumsi dan kebutuhan rapat warga.', 175000, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Entertain/Konsumsi Rapat'),
-- Atk+Copy+Dasawisma
('expense', 'Atk+Copy+Dasawisma', 'Pembelian alat tulis, fotokopi, dan kebutuhan Dasawisma.', 214000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Atk+Copy+Dasawisma'),
-- Operasional Rt
('expense', 'Operasional Rt', 'Kegiatan operasional RT termasuk pemilihan RT.', 2009000, '2026-01-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Operasional Rt'),
('expense', 'Operasional Rt', 'Kegiatan operasional RT termasuk penamaan jalan.', 3750000, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Operasional Rt'),
-- Lampu
('expense', 'Lampu', 'Biaya listrik dan perawatan lampu lingkungan.', 735000, '2026-01-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Lampu'),
('expense', 'Lampu', 'Biaya listrik dan perawatan lampu lingkungan.', 393500, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Lampu'),
('expense', 'Lampu', 'Biaya listrik dan perawatan lampu lingkungan.', 350000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Lampu'),
-- Bensin Alat Kebersihan
('expense', 'Bensin Alat Kebersihan', 'Pembelian bahan bakar alat kebersihan dan perawatan saluran Blok O.', 500000, '2026-02-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Bensin Alat Kebersihan'),
('expense', 'Bensin Alat Kebersihan', 'Pembelian bahan bakar alat kebersihan.', 50000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Bensin Alat Kebersihan'),
-- Dana Sosial
('expense', 'Dana Sosial', 'Dana sosial untuk kebutuhan warga.', 250000, '2026-03-01', '00000000-0000-0000-0000-000000000000', 'a0000000-0000-7000-8000-000000000001', 'b0000000-0000-7000-8000-000000000002', 'Dana Sosial');
