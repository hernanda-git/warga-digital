-- Add community_id column to users table with default
ALTER TABLE users ADD COLUMN community_id UUID DEFAULT 'b0000000-0000-7000-8000-000000000002';

-- Update existing users to set the default community_id (explicit update for clarity, though DEFAULT should handle new rows)
UPDATE users SET community_id = 'b0000000-0000-7000-8000-000000000002' WHERE community_id IS NULL;
