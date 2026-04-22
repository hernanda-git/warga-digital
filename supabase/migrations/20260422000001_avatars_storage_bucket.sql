-- =============================================================================
-- WARGA DIGITAL — Avatars Storage Bucket Setup
-- Migration: 20260422000001_avatars_storage_bucket.sql
-- Created: 2026-04-22
--
-- Sets up avatars storage bucket for profile pictures and organisation member photos.
-- =============================================================================

-- =============================================================================
-- AVATARS BUCKET
-- =============================================================================

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES FOR AVATARS
-- =============================================================================

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Public read access for all avatars
CREATE POLICY "Public read access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
-- Path structures:
--   - {user_id}/avatar.jpg (user profile)
--   - organisation-members/custom-{member_id}-{timestamp}.jpg (organisation members)
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (
      -- User's own avatar
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Organisation members (admins with can_manage_organisation)
      EXISTS (
        SELECT 1 
        FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
          AND tu.status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 
            FROM tenant_user_roles tur
            JOIN roles r ON tur.role_id = r.id
            WHERE tur.tenant_user_id = tu.id
              AND tur.revoked_at IS NULL
              AND r.name = 'can_manage_organisation'
          )
      )
    )
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (
      -- User's own avatar
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Organisation members (admins with can_manage_organisation)
      EXISTS (
        SELECT 1 
        FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
          AND tu.status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 
            FROM tenant_user_roles tur
            JOIN roles r ON tur.role_id = r.id
            WHERE tur.tenant_user_id = tu.id
              AND tur.revoked_at IS NULL
              AND r.name = 'can_manage_organisation'
          )
      )
    )
  );

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
