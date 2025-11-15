-- ====================================================
-- Seed Test Data for Admin Panel
-- Session Logs & Reports & Feedback
-- ====================================================
-- Run this SQL in your database to populate test data
-- ====================================================

-- NOTE: This script assumes you have:
-- - At least one user (admin, mentor, learner)
-- - At least one booking session
-- Replace the IDs with actual IDs from your database

-- ====================================================
-- 1. SESSION LOGS (session_logs table)
-- ====================================================
-- These are automatically created when sessions happen,
-- but you can insert test data manually:

-- Example: Insert session log for a session that was created
INSERT INTO session_logs (session_id, event_type, actor_type, actor_id, old_status, new_status, description, metadata, created_at)
VALUES
  -- Replace 1 with an actual session_id from your booking_sessions table
  (1, 'status_changed', 'system', NULL, NULL, 'scheduled', 'Session was created and scheduled', '{"bookingDate": "2025-01-15", "duration": 60}', NOW() - INTERVAL '2 days'),
  (1, 'user_joined', 'learner', 2, NULL, NULL, 'Learner joined the session', '{"joinTime": "2025-01-15T10:00:00"}', NOW() - INTERVAL '1 day'),
  (1, 'user_joined', 'mentor', 3, NULL, NULL, 'Mentor joined the session', '{"joinTime": "2025-01-15T10:02:00"}', NOW() - INTERVAL '1 day'),
  (1, 'status_changed', 'system', NULL, 'scheduled', 'in_progress', 'Session started', '{"startTime": "2025-01-15T10:02:00"}', NOW() - INTERVAL '1 day'),
  (1, 'user_left', 'learner', 2, NULL, NULL, 'Learner left the session', '{"leaveTime": "2025-01-15T11:00:00", "duration": 60}', NOW() - INTERVAL '1 day'),
  (1, 'user_left', 'mentor', 3, NULL, NULL, 'Mentor left the session', '{"leaveTime": "2025-01-15T11:00:00", "duration": 58}', NOW() - INTERVAL '1 day'),
  (1, 'status_changed', 'system', NULL, 'in_progress', 'completed', 'Session completed successfully', '{"endTime": "2025-01-15T11:00:00", "duration": 58}', NOW() - INTERVAL '1 day');

-- ====================================================
-- 2. SESSION CONNECTION LOGS (session_connection_logs table)
-- ====================================================
-- These track join/leave cycles for detecting gaming behavior

INSERT INTO session_connection_logs (session_id, user_id, user_role, action, connection_duration_ms, metadata, created_at)
VALUES
  -- Learner joined and left
  (1, 2, 'learner', 'joined', NULL, '{"browser": "Chrome", "platform": "Windows"}', NOW() - INTERVAL '1 day 50 minutes'),
  (1, 2, 'learner', 'left', 3600000, '{"duration": "60 minutes"}', NOW() - INTERVAL '1 day'),

  -- Mentor joined and left
  (1, 3, 'mentor', 'joined', NULL, '{"browser": "Firefox", "platform": "Mac"}', NOW() - INTERVAL '1 day 48 minutes'),
  (1, 3, 'mentor', 'left', 3480000, '{"duration": "58 minutes"}', NOW() - INTERVAL '1 day');

-- ====================================================
-- 3. USER REPORTS (user_reports table)
-- ====================================================
-- These are created when users report other users

INSERT INTO user_reports (reporter_id, reported_user_id, session_id, category, description, evidence, status, admin_notes, reviewed_by, reviewed_at, resolution, created_at, updated_at)
VALUES
  -- Pending harassment report
  (2, 3, 1, 'harassment', 'The mentor was using inappropriate language during our session. They made me uncomfortable with personal comments.',
   '{"chatLogs": ["Message 1", "Message 2"], "timestamp": "2025-01-15T10:30:00"}',
   'pending', NULL, NULL, NULL, NULL,
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

  -- Resolved fraud report
  (4, 5, NULL, 'fraud', 'This user is asking for payments outside the platform to avoid fees.',
   '{"screenshots": ["screenshot1.png"], "evidence": "User sent direct message asking for PayPal"}',
   'resolved', 'Investigated and confirmed violation. User was warned and suspended for 7 days.',
   1, NOW() - INTERVAL '1 day', 'User account suspended for 7 days. Direct payment solicitation is against ToS.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

  -- Under review inappropriate content
  (6, 7, 2, 'inappropriate_content', 'Mentor shared inappropriate images during screen sharing.',
   '{"reportType": "screen_share", "sessionTime": "2025-01-14T15:00:00"}',
   'under_review', 'Reviewing evidence and session recordings.',
   1, NULL, NULL,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- Dismissed report (false alarm)
  (8, 9, NULL, 'other', 'User is spamming messages.',
   NULL,
   'dismissed', 'After review, messages were legitimate platform notifications. No violation found.',
   1, NOW() - INTERVAL '5 hours', 'No policy violation. Reporter was confused about notification settings.',
   NOW() - INTERVAL '12 hours', NOW() - INTERVAL '5 hours'),

  -- Another pending technical issue report
  (10, 11, 3, 'other', 'Mentor ended the session early without providing the full time I paid for.',
   '{"paidDuration": 60, "actualDuration": 30, "sessionId": 3}',
   'pending', NULL, NULL, NULL, NULL,
   NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes');

-- ====================================================
-- NOTES:
-- ====================================================
-- 1. Replace user IDs (1, 2, 3, etc.) with actual user IDs from your database
-- 2. Replace session IDs (1, 2, 3) with actual booking_sessions IDs
-- 3. Make sure the referenced users exist in your users table
-- 4. For testing, you can use your own user ID as both reporter and admin

-- To get actual IDs from your database, run these queries first:
-- SELECT id, email, role FROM users ORDER BY id LIMIT 20;
-- SELECT id, status, scheduled_start FROM booking_sessions ORDER BY id LIMIT 10;

-- ====================================================
-- Quick Test Query to Verify Data
-- ====================================================
-- Check session logs:
-- SELECT * FROM session_logs ORDER BY created_at DESC LIMIT 10;

-- Check session connection logs:
-- SELECT * FROM session_connection_logs ORDER BY created_at DESC LIMIT 10;

-- Check user reports:
-- SELECT
--   r.id,
--   r.status,
--   r.category,
--   reporter.email as reporter_email,
--   reported.email as reported_email
-- FROM user_reports r
-- LEFT JOIN users reporter ON r.reporter_id = reporter.id
-- LEFT JOIN users reported ON r.reported_user_id = reported.id
-- ORDER BY r.created_at DESC;
