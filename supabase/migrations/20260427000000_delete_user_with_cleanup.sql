-- =============================================================================
-- WARGA DIGITAL — Delete User with Cleanup
-- Migration: 20260427000000_delete_user_with_cleanup.sql
-- Created: 2026-04-27
--
-- Creates a function to safely delete users while:
-- 1. Transferring house ownership to family members
-- 2. Revoking authority roles
-- 3. Archiving marketplace items
-- 4. Preserving transaction history
-- 5. Handling all cascade deletions properly
-- =============================================================================

-- Drop function if exists (for re-runnability)
DROP FUNCTION IF EXISTS delete_user_with_cleanup(UUID);

-- Create the function
CREATE OR REPLACE FUNCTION delete_user_with_cleanup(target_user_id UUID)
RETURNS TABLE(
  houses_transferred INT,
  houses_vacated INT,
  authority_roles_revoked INT,
  marketplace_items_archived INT,
  join_requests_rejected INT,
  tenant_roles_revoked INT,
  prereg_owners_skipped INT,
  user_deleted BOOLEAN
) AS $$
DECLARE
  v_houses_transferred INT := 0;
  v_houses_vacated INT := 0;
  v_authority_revoked INT := 0;
  v_marketplace_archived INT := 0;
  v_join_requests_rejected INT := 0;
  v_tenant_roles_revoked INT := 0;
  v_prereg_skipped INT := 0;
  v_user_deleted BOOLEAN := false;
  v_house_record RECORD;
  v_family_member RECORD;
BEGIN
  -- =============================================================================
  -- STEP 1: Transfer house ownership to family members
  -- =============================================================================
  -- For each house where the user is primary OWNER:
  --   - Find first active FAMILY member (by created_at)
  --   - Transfer ownership to them
  --   - If no family member exists, leave house vacant
  --   - Mark user's house record as INACTIVE
  
  FOR v_house_record IN 
    SELECT uh.id, uh.house_id, uh.tenant_id
    FROM user_houses uh
    WHERE uh.user_id = target_user_id
      AND uh.relationship = 'OWNER'
      AND uh.is_primary = true
      AND uh.status = 'ACTIVE'
  LOOP
    -- Find a family member to transfer ownership
    SELECT uh2.id, uh2.user_id INTO v_family_member
    FROM user_houses uh2
    WHERE uh2.house_id = v_house_record.house_id
      AND uh2.relationship = 'FAMILY'
      AND uh2.status = 'ACTIVE'
    ORDER BY uh2.created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Transfer ownership to family member
      UPDATE user_houses
      SET relationship = 'OWNER',
          is_primary = true
      WHERE id = v_family_member.id;
      
      v_houses_transferred := v_houses_transferred + 1;
    ELSE
      -- No family member found, leave house vacant
      v_houses_vacated := v_houses_vacated + 1;
    END IF;
    
    -- Mark the user's house record as inactive
    UPDATE user_houses
    SET status = 'INACTIVE',
        is_primary = false,
        move_out_date = CURRENT_DATE
    WHERE id = v_house_record.id;
  END LOOP;
  
  -- =============================================================================
  -- STEP 2: Revoke authority roles
  -- =============================================================================
  -- Set status = 'REVOKED' and end_date = CURRENT_DATE for all active
  -- authority assignments belonging to the user
  
  UPDATE authority_assignments aa
  SET status = 'REVOKED',
      end_date = CURRENT_DATE
  FROM tenant_users tu
  WHERE aa.tenant_user_id = tu.id
    AND tu.user_id = target_user_id
    AND aa.status = 'ACTIVE';
  
  GET DIAGNOSTICS v_authority_revoked = ROW_COUNT;
  
  -- =============================================================================
  -- STEP 3: Archive active marketplace items
  -- =============================================================================
  -- Archive all ACTIVE marketplace items owned by the user
  -- This prevents new transactions while preserving history
  
  UPDATE marketplace_items
  SET status = 'ARCHIVED',
      updated_at = NOW()
  WHERE owner_user_id = target_user_id
    AND status = 'ACTIVE';
  
  GET DIAGNOSTICS v_marketplace_archived = ROW_COUNT;
  
  -- =============================================================================
  -- STEP 4: Reject pending join requests (where user is requester)
  -- =============================================================================
  -- Auto-reject all pending house join requests made by the user
  
  UPDATE house_join_requests
  SET status = 'REJECTED',
      responded_at = NOW(),
      responded_by = target_user_id
  WHERE requester_user_id = target_user_id
    AND status = 'PENDING';
  
  GET DIAGNOSTICS v_join_requests_rejected = ROW_COUNT;
  
  -- =============================================================================
  -- STEP 5: Revoke tenant user roles
  -- =============================================================================
  -- Set revoked_at = NOW() for all active tenant user roles
  
  UPDATE tenant_user_roles tur
  SET revoked_at = NOW()
  FROM tenant_users tu
  WHERE tur.tenant_user_id = tu.id
    AND tu.user_id = target_user_id
    AND tur.revoked_at IS NULL;
  
  GET DIAGNOSTICS v_tenant_roles_revoked = ROW_COUNT;
  
  -- =============================================================================
  -- STEP 6: Mark pre-registered owners as skipped
  -- =============================================================================
  -- If user claimed any system pre-registered owners, mark them as SKIPPED
  
  UPDATE system_preregistered_house_owners
  SET status = 'SKIPPED',
      updated_at = NOW()
  WHERE claimed_by_user_id = target_user_id
    AND status = 'CLAIMED';
  
  GET DIAGNOSTICS v_prereg_skipped = ROW_COUNT;
  
  -- =============================================================================
  -- STEP 7: NULL out references in tables without ON DELETE SET NULL
  -- =============================================================================
  -- Set created_by and updated_by to NULL for tables that don't have
  -- ON DELETE SET NULL in their foreign key constraints
  
  -- Notifications (created_by, updated_by)
  UPDATE notifications
  SET created_by = NULL,
      updated_by = NULL
  WHERE created_by = target_user_id OR updated_by = target_user_id;
  
  -- Houses (created_by, updated_by)
  UPDATE houses
  SET created_by = NULL,
      updated_by = NULL
  WHERE created_by = target_user_id OR updated_by = target_user_id;
  
  -- Tenants (created_by, updated_by)
  UPDATE tenants
  SET created_by = NULL,
      updated_by = NULL
  WHERE created_by = target_user_id OR updated_by = target_user_id;
  
  -- Communities (created_by, updated_by)
  UPDATE communities
  SET created_by = NULL,
      updated_by = NULL
  WHERE created_by = target_user_id OR updated_by = target_user_id;
  
  -- Roles (created_by, updated_by)
  UPDATE roles
  SET created_by = NULL,
      updated_by = NULL
  WHERE created_by = target_user_id OR updated_by = target_user_id;
  
  -- =============================================================================
  -- STEP 8: Delete the user (CASCADE handles the rest)
  -- =============================================================================
  -- PostgreSQL CASCADE will automatically delete:
  --   - sessions, otp_codes, password_reset_tokens
  --   - tenant_users (→ tenant_user_roles, authority_assignments)
  --   - user_houses (after ownership transfer)
  --   - marketplace_items (→ media, tags, transactions, events)
  --   - notifications (recipient_user_id)
  --   - user_badges
  --   - house_join_requests (requester_user_id)
  --   
  -- CASCADE will SET NULL on:
  --   - audit_logs (user_id)
  --   - articles (author_id, created_by, updated_by, deleted_by)
  --   - announcements (author_user_id, created_by, updated_by)
  --   - organisation_members (user_id)
  --   - system_preregistered_house_owners (claimed_by_user_id)
  --   - houses (created_by, updated_by) - NULLed in STEP 7
  --   - tenants (created_by, updated_by) - NULLed in STEP 7
  --   - communities (created_by, updated_by) - NULLed in STEP 7
  --   - roles (created_by, updated_by) - NULLed in STEP 7
  --   - notifications (created_by, updated_by) - NULLed in STEP 7
  --   
  -- Preserved (no user reference or user_id not null):
  --   - kas_rt_transactions (created_by preserved for history)
  --   - marketplace_transactions (buyer/seller preserved for history)
  
  DELETE FROM users WHERE id = target_user_id;
  
  IF FOUND THEN
    v_user_deleted := true;
  END IF;
  
  -- Return summary
  RETURN QUERY SELECT
    v_houses_transferred,
    v_houses_vacated,
    v_authority_revoked,
    v_marketplace_archived,
    v_join_requests_rejected,
    v_tenant_roles_revoked,
    v_prereg_skipped,
    v_user_deleted;
END;
$$ LANGUAGE plpgsql;

-- Add documentation comment
COMMENT ON FUNCTION delete_user_with_cleanup(UUID) IS 
  'Safely deletes a user while:
   1. Transferring house ownership to family members (or leaving vacant)
   2. Revoking authority roles (RT_ADMIN, RW_ADMIN, etc.)
   3. Archiving active marketplace items
   4. Rejecting pending house join requests
   5. Revoking tenant user roles
   6. Marking claimed pre-registered owners as skipped
   7. NULLing out created_by/updated_by references (houses, tenants, communities, roles, notifications)
   8. Preserving transaction history (Kas RT, Marketplace transactions)
   
   Returns counts of affected records and whether user was deleted.';

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Basic usage:
-- SELECT * FROM delete_user_with_cleanup('user-uuid-here');

-- Check results:
-- SELECT 
--   houses_transferred,
--   houses_vacated,
--   authority_roles_revoked,
--   marketplace_items_archived,
--   join_requests_rejected,
--   tenant_roles_revoked,
--   prereg_owners_skipped,
--   user_deleted
-- FROM delete_user_with_cleanup('user-uuid-here');

-- =============================================================================
-- ROLLBACK (IF NEEDED)
-- =============================================================================
-- This function cannot be rolled back once executed as it performs DELETE.
-- To restore deleted data, you must restore from database backup.
-- 
-- To drop the function:
-- DROP FUNCTION IF EXISTS delete_user_with_cleanup(UUID);
