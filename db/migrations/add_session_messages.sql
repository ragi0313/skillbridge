-- Add session_messages table for persistent chat storage during video sessions
-- This replaces the in-memory storage to ensure messages persist across server restarts
-- and work correctly with load balancers

CREATE TABLE IF NOT EXISTS session_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('learner', 'mentor')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS session_messages_session_idx ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS session_messages_session_timestamp_idx ON session_messages(session_id, timestamp);

-- Add comment to table
COMMENT ON TABLE session_messages IS 'Stores chat messages sent during video sessions. Messages are ephemeral and may be automatically deleted after session completion.';
COMMENT ON COLUMN session_messages.session_id IS 'Reference to the booking session';
COMMENT ON COLUMN session_messages.sender_role IS 'Role of the message sender (learner or mentor)';
COMMENT ON COLUMN session_messages.message IS 'Sanitized message content (HTML stripped via DOMPurify)';
