-- =============================================================================
-- WARGA DIGITAL — Seed Jasa Categories
-- Migration: 20260411000000_seed_jasa_categories.sql
-- Created: 2026-04-11
--
-- This migration seeds the initial Jasa (services) categories for the marketplace.
-- Categories are linked to the JASA domain.
-- =============================================================================

-- Ensure the JASA domain exists
INSERT INTO marketplace_domains (id, code, name, description, icon, sort_order, is_active) VALUES
  ('d0000000-0000-7000-8000-000000000002'::uuid, 'JASA', 'Jasa Warga', 'Layanan jasa antar-warga', '🔧', 2, true)
ON CONFLICT (id) DO NOTHING;

-- Insert Jasa categories if they don't already exist
INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order, is_active) VALUES
  ('c2000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Kelistrikan', 'kelistrikan', 'Perbaikan & instalasi listrik', '⚡', 1, true),
  ('c2000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Jahit', 'jahit', 'Jahit baju, kaos, dll', '🧵', 2, true),
  ('c2000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Antar-Jemput', 'antar-jemput', 'Antar jemput dalam kompleks', '🚗', 3, true),
  ('c2000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Bersih-bersih', 'bersih-bersih', 'Kebersihan rumah & kantor', '🧹', 4, true),
  ('c2000000-0000-7000-8000-000000000005'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Perbaikan Rumah', 'perbaikan-rumah', 'Perbaikan atap, dinding, pintu, jendela', '🔨', 5, true),
  ('c2000000-0000-7000-8000-000000000006'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Perbaikan Elektronik', 'perbaikan-elektronik', 'TV, kulkas, mesin cuci, dll', '📺', 6, true),
  ('c2000000-0000-7000-8000-000000000007'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Les Privat', 'les-privat', 'Les matematika, bahasa, musik, dll', '📚', 7, true),
  ('c2000000-0000-7000-8000-000000000008'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Fotografi', 'fotografi', 'Foto prewedding, wisuda, event', '📸', 8, true),
  ('c2000000-0000-7000-8000-000000000009'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Lainnya', 'lainnya', 'Layanan jasa lainnya', '🔧', 99, true)
ON CONFLICT (id) DO NOTHING;
