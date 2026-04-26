-- Add password_reset_tokens table for forgot PIN flow
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token_hash)
);

-- Index for fast lookups by token hash
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)
  WHERE used_at IS NULL;
