-- =============================================================================
-- WARGA DIGITAL — Storage Buckets Setup
-- Migration: 20260411000000_storage_buckets.sql
-- Created: 2026-04-11
--
-- Sets up storage buckets for file uploads in the application.
-- =============================================================================

-- =============================================================================
-- JASA IMAGES BUCKET
-- =============================================================================

-- Create the jasa-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('jasa-images', 'jasa-images', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES FOR JASA-IMAGES
-- =============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for jasa images
CREATE POLICY "Public read access for jasa images" ON storage.objects
  FOR SELECT USING (bucket_id = 'jasa-images');

-- Owners can upload their own service images
-- Path structure: {user_id}/{service_id}/{filename}
CREATE POLICY "Users can upload own service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'jasa-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can update their own service images
CREATE POLICY "Users can update own service images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'jasa-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can delete their own service images
CREATE POLICY "Users can delete own service images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'jasa-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- MARKETPLACE IMAGES BUCKET (Future Use)
-- =============================================================================

-- Create marketplace-images bucket for general marketplace items
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for marketplace images
CREATE POLICY "Public read access for marketplace images" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketplace-images');

-- Owners can upload their own marketplace item images
CREATE POLICY "Users can upload own marketplace images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own marketplace images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own marketplace images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'marketplace-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
