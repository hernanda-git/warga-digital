-- Create audit_logs table for tracking system operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles
      INNER JOIN public.tenant_users ON tenant_user_roles.tenant_user_id = tenant_users.id
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_user_roles.role_id IN (4, 5, 6, 7) -- RT_ADMIN, RW_ADMIN, KOPERASI_ADMIN, PLATFORM_ARBITER
      AND tenant_user_roles.revoked_at IS NULL
    )
  );

-- RLS Policy: Only admins can insert audit logs (typically done server-side)
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles
      INNER JOIN public.tenant_users ON tenant_user_roles.tenant_user_id = tenant_users.id
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_user_roles.role_id IN (4, 5, 6, 7) -- RT_ADMIN, RW_ADMIN, KOPERASI_ADMIN, PLATFORM_ARBITER
      AND tenant_user_roles.revoked_at IS NULL
    )
  );

-- RLS Policy: No one can delete audit logs (immutable)
CREATE POLICY "No delete on audit logs" ON public.audit_logs
  FOR DELETE USING (false);

-- RLS Policy: No one can update audit logs (immutable)
CREATE POLICY "No update on audit logs" ON public.audit_logs
  FOR UPDATE USING (false);

-- Comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Immutable audit log for tracking system operations';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (e.g., orphan_cleanup, image_delete, article_delete)';
COMMENT ON COLUMN public.audit_logs.details IS 'JSONB details about the action';
