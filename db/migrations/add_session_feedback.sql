-- Add session feedback table and tracking fields
-- Migration: add_session_feedback.sql

-- Create session_feedback table
CREATE TABLE IF NOT EXISTS session_feedback (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  reviewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_role VARCHAR(20) NOT NULL CHECK (reviewer_role IN ('learner', 'mentor')),

  -- Rating fields (1-5 scale)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  knowledge_rating INTEGER CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
  helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),

  -- Text feedback
  feedback_text TEXT NOT NULL,
  improvement_suggestions TEXT,
  most_valuable_aspect TEXT,

  -- Structured feedback
  session_highlights TEXT, -- JSON array of selected highlights
  session_pace VARCHAR(20) CHECK (session_pace IN ('too_slow', 'just_right', 'too_fast')),
  would_recommend BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS session_feedback_session_reviewer_idx ON session_feedback(session_id, reviewer_role);

-- Add feedback tracking fields to booking_sessions table
ALTER TABLE booking_sessions
ADD COLUMN IF NOT EXISTS learner_feedback_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mentor_feedback_submitted BOOLEAN DEFAULT FALSE;

-- Create index for feedback tracking
CREATE INDEX IF NOT EXISTS booking_sessions_feedback_tracking_idx ON booking_sessions(learner_feedback_submitted, mentor_feedback_submitted);

COMMENT ON TABLE session_feedback IS 'Stores feedback and ratings submitted by learners and mentors after sessions';
COMMENT ON COLUMN session_feedback.reviewer_role IS 'Role of the person submitting feedback: learner or mentor';
COMMENT ON COLUMN session_feedback.session_highlights IS 'JSON array of selected positive aspects of the session';
COMMENT ON COLUMN session_feedback.session_pace IS 'User perception of session pacing: too_slow, just_right, or too_fast';