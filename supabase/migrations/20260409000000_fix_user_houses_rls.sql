-- =============================================================================
-- Fix user_houses RLS policies
-- Add policy for authenticated users to read user_houses within their tenant
-- =============================================================================

-- Drop the existing anon-only policy (we'll recreate it more specifically)
DROP POLICY IF EXISTS "User houses: no anon access" ON user_houses;

-- Anon cannot access user_houses at all
CREATE POLICY "User houses: no anon access" 
  ON user_houses 
  FOR ALL 
  TO anon 
  USING (false) 
  WITH CHECK (false);

-- Authenticated users can read user_houses within their tenant
-- This allows counting active residents for Kas RT calculations
CREATE POLICY "Authenticated users can read user_houses in tenant" 
  ON user_houses 
  FOR SELECT 
  TO authenticated 
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

-- Users can read their own user_houses records
CREATE POLICY "Users can read own user_houses" 
  ON user_houses 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Users can insert their own user_houses (for house join requests acceptance)
CREATE POLICY "Users can insert own user_houses" 
  ON user_houses 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own user_houses
CREATE POLICY "Users can update own user_houses" 
  ON user_houses 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE user_houses IS 'Links users to houses with relationship type (OWNER, FAMILY, TENANT, CARETAKER). RLS allows authenticated users to read within their tenant for Kas RT calculations.';
