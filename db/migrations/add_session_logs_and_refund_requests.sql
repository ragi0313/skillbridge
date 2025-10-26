-- Migration: Add session logs, connection tracking, and refund requests
-- Created: 2025-01-23
-- Purpose: Add audit trail for sessions, track join/leave cycles, and handle refund requests

-- Session activity logs for audit trail and debugging
CREATE TABLE IF NOT EXISTS session_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  actor_id INTEGER REFERENCES users(id),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX session_logs_session_id_idx ON session_logs(session_id);
CREATE INDEX session_logs_event_type_idx ON session_logs(event_type);
CREATE INDEX session_logs_actor_type_idx ON session_logs(actor_type);
CREATE INDEX session_logs_created_at_idx ON session_logs(created_at);

-- Session join/leave tracking to handle rapid join/leave cycles
CREATE TABLE IF NOT EXISTS session_connection_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL,
  connection_duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX session_connection_logs_session_user_idx ON session_connection_logs(session_id, user_id);
CREATE INDEX session_connection_logs_session_idx ON session_connection_logs(session_id);
CREATE INDEX session_connection_logs_created_at_idx ON session_connection_logs(created_at);

-- Refund requests from learners for disputed sessions
CREATE TABLE IF NOT EXISTS refund_requests (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_reason VARCHAR(50) NOT NULL,
  detailed_reason TEXT NOT NULL,
  evidence_urls JSONB,
  requested_amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  response_message TEXT,
  refunded_amount INTEGER,
  refund_processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX refund_requests_session_id_idx ON refund_requests(session_id);
CREATE INDEX refund_requests_requested_by_idx ON refund_requests(requested_by);
CREATE INDEX refund_requests_status_idx ON refund_requests(status);
CREATE INDEX refund_requests_created_at_idx ON refund_requests(created_at);

-- Add comments for documentation
COMMENT ON TABLE session_logs IS 'Audit trail of all session state changes and actions';
COMMENT ON TABLE session_connection_logs IS 'Tracks every join/leave action to detect rapid cycling and calculate accurate connection times';
COMMENT ON TABLE refund_requests IS 'Learner-initiated refund requests for disputed or problematic sessions';
