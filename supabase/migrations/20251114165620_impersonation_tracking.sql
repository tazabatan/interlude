-- Impersonation logs table
-- Tracks admin impersonation sessions for audit and troubleshooting

-- Table to track impersonation sessions
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  impersonated_user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  time_limit_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to track individual actions during impersonation
CREATE TABLE IF NOT EXISTS impersonation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES impersonation_logs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'page_view', 'form_submit', 'api_call', etc.
  action_path TEXT, -- URL path or API endpoint
  action_details JSONB, -- Additional details about the action
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin_user
  ON impersonation_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_impersonated_user
  ON impersonation_logs(impersonated_user_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_status
  ON impersonation_logs(status);

CREATE INDEX IF NOT EXISTS idx_impersonation_actions_session
  ON impersonation_actions(session_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_actions_timestamp
  ON impersonation_actions(timestamp);

-- Enable Row Level Security
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access impersonation logs
CREATE POLICY "Service role can access impersonation logs"
  ON impersonation_logs
  FOR ALL
  USING (true);

CREATE POLICY "Service role can access impersonation actions"
  ON impersonation_actions
  FOR ALL
  USING (true);
