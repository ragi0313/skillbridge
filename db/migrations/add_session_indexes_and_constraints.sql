-- Add indexes for better session query performance
-- These indexes will significantly improve the performance of session monitoring and queries

-- Index on booking_sessions for status-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_booking_sessions_status ON booking_sessions(status);

-- Index on start_time for session monitoring queries
CREATE INDEX IF NOT EXISTS idx_booking_sessions_start_time ON booking_sessions(start_time);

-- Index on end_time for session completion queries  
CREATE INDEX IF NOT EXISTS idx_booking_sessions_end_time ON booking_sessions(end_time);

-- Composite index for no-show detection queries (status + start_time + no_show_checked_at)
CREATE INDEX IF NOT EXISTS idx_booking_sessions_no_show_check 
ON booking_sessions(status, start_time) 
WHERE no_show_checked_at IS NULL;

-- Index for session monitoring completion queries
CREATE INDEX IF NOT EXISTS idx_booking_sessions_ongoing_end 
ON booking_sessions(status, end_time) 
WHERE status = 'ongoing';

-- Index on user_id columns for auth queries
CREATE INDEX IF NOT EXISTS idx_learners_user_id ON learners(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id);

-- Index on session join/leave timestamps for connection duration calculations
CREATE INDEX IF NOT EXISTS idx_booking_sessions_join_times 
ON booking_sessions(learner_joined_at, mentor_joined_at, learner_left_at, mentor_left_at);

-- Index for credit transaction queries by user
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_session 
ON credit_transactions(user_id, related_session_id);

-- Index for mentor payout queries
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_session ON mentor_payouts(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_mentor_status ON mentor_payouts(mentor_id, status);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Add database constraints for data integrity

-- Session status constraints
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_session_status 
CHECK (status IN ('pending', 'confirmed', 'upcoming', 'ongoing', 'completed', 'cancelled', 'both_no_show', 'learner_no_show', 'mentor_no_show', 'technical_issues', 'rejected'));

-- Connection duration constraints (must be non-negative)
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_learner_duration 
CHECK (learner_connection_duration_ms >= 0);

ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_mentor_duration 
CHECK (mentor_connection_duration_ms >= 0);

-- Credit amount constraints (must be positive)
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_total_cost_positive 
CHECK (total_cost_credits > 0);

ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_escrow_positive 
CHECK (escrow_credits >= 0);

-- Time constraints (end time must be after start time)
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_session_time_order 
CHECK (end_time > start_time);

-- Join time constraints (can't leave before joining)
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_learner_join_leave_order 
CHECK (learner_left_at IS NULL OR learner_joined_at IS NULL OR learner_left_at >= learner_joined_at);

ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_mentor_join_leave_order 
CHECK (mentor_left_at IS NULL OR mentor_joined_at IS NULL OR mentor_left_at >= mentor_joined_at);

-- Credit transaction constraints
ALTER TABLE credit_transactions 
ADD CONSTRAINT chk_transaction_amount 
CHECK (amount > 0);

ALTER TABLE credit_transactions 
ADD CONSTRAINT chk_transaction_direction 
CHECK (direction IN ('credit', 'debit'));

ALTER TABLE credit_transactions 
ADD CONSTRAINT chk_balance_order 
CHECK (balance_after >= 0 AND balance_before >= 0);

-- Mentor payout constraints
ALTER TABLE mentor_payouts 
ADD CONSTRAINT chk_payout_status 
CHECK (status IN ('pending', 'released', 'paid_out', 'failed'));

ALTER TABLE mentor_payouts 
ADD CONSTRAINT chk_payout_amounts 
CHECK (earned_credits > 0 AND platform_fee_credits >= 0);

ALTER TABLE mentor_payouts 
ADD CONSTRAINT chk_fee_percentage 
CHECK (fee_percentage >= 0 AND fee_percentage <= 100);

-- User role constraints for learners and mentors
ALTER TABLE learners 
ADD CONSTRAINT chk_learner_credits 
CHECK (credits_balance >= 0);

ALTER TABLE mentors 
ADD CONSTRAINT chk_mentor_credits 
CHECK (credits_balance >= 0);

-- Notification type constraints
ALTER TABLE notifications 
ADD CONSTRAINT chk_notification_type 
CHECK (type IN ('session_booked', 'session_confirmed', 'session_cancelled', 'session_completed', 'session_no_show', 'session_refunded', 'payment_received', 'credit_purchased', 'system_announcement'));

-- Create partial indexes for frequently filtered queries
-- These are more efficient than full table scans for specific conditions

-- Index for active sessions only
CREATE INDEX IF NOT EXISTS idx_booking_sessions_active 
ON booking_sessions(id, start_time, end_time) 
WHERE status IN ('upcoming', 'ongoing');

-- Index for completed sessions with payments
CREATE INDEX IF NOT EXISTS idx_booking_sessions_completed_paid 
ON booking_sessions(id, total_cost_credits, agora_call_ended_at) 
WHERE status = 'completed' AND total_cost_credits > 0;

-- Index for sessions needing no-show processing
CREATE INDEX IF NOT EXISTS idx_booking_sessions_no_show_candidates 
ON booking_sessions(id, start_time, learner_joined_at, mentor_joined_at) 
WHERE status IN ('confirmed', 'upcoming', 'ongoing') AND no_show_checked_at IS NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_booking_sessions_status IS 'Primary index for session status queries';
COMMENT ON INDEX idx_booking_sessions_start_time IS 'Index for session monitoring by start time';
COMMENT ON INDEX idx_booking_sessions_no_show_check IS 'Optimized index for no-show detection queries';
COMMENT ON INDEX idx_booking_sessions_ongoing_end IS 'Index for auto-completion of ongoing sessions';

-- Analyze tables to update statistics for query planner
ANALYZE booking_sessions;
ANALYZE learners;
ANALYZE mentors;
ANALYZE credit_transactions;
ANALYZE mentor_payouts;
ANALYZE notifications;