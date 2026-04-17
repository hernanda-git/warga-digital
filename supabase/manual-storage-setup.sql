-- =============================================================================
-- WARGA DIGITAL — Manual Storage Buckets Setup
-- File: manual-storage-setup.sql
--
-- This script manually sets up storage buckets for file uploads in the application.
-- Run this in your Supabase SQL Editor if the automated migration fails.
--
-- Buckets Created:
--   1. jasa-images - For Jasa service photos
--   2. marketplace-images - For marketplace item photos
-- =============================================================================

-- =============================================================================
-- 1. JASA IMAGES BUCKET
-- =============================================================================

-- Step 1a: Create the jasa-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('jasa-images', 'jasa-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 1b: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 1c: Create RLS policies for jasa-images bucket
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
-- 2. MARKETPLACE IMAGES BUCKET
-- =============================================================================

-- Step 2a: Create marketplace-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2b: Create RLS policies for marketplace-images bucket
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
-- 3. VERIFICATION QUERIES (Optional)
-- =============================================================================

-- Check if buckets were created successfully
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('jasa-images', 'marketplace-images');

-- Check if policies were created
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

-- Next steps:
-- 1. The jasa-images bucket is ready for service photo uploads
-- 2. The marketplace-images bucket is ready for marketplace item photos
-- 3. Test by trying to upload an image through the Jasa create/edit forms
