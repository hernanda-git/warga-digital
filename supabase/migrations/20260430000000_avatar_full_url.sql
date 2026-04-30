-- Migrate avatar_path from relative path to full R2 URL
-- This aligns with how other images (featured_image_url, etc.) store full URLs.

UPDATE users
SET avatar_path = 'https://oo.warga-digital.com/' || avatar_path
WHERE avatar_path IS NOT NULL
  AND avatar_path NOT LIKE 'https://%';

COMMENT ON COLUMN users.avatar_path IS 'Full R2 URL to profile picture (e.g. https://oo.warga-digital.com/{userId}/avatar.jpg). Null = use initials.';
