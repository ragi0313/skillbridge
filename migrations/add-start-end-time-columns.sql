-- Migration to add startTime and endTime columns to booking_sessions table
-- Run this migration to add explicit start and end time tracking

-- Add the new columns
ALTER TABLE booking_sessions 
ADD COLUMN start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;

-- Update existing records with calculated start/end times based on scheduledDate and durationMinutes
UPDATE booking_sessions 
SET 
  start_time = scheduled_date,
  end_time = scheduled_date + INTERVAL '1 minute' * duration_minutes
WHERE start_time IS NULL AND end_time IS NULL;

-- Make the columns NOT NULL after populating them
ALTER TABLE booking_sessions 
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_booking_sessions_start_time ON booking_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_end_time ON booking_sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_time_range ON booking_sessions(start_time, end_time);

-- Add constraint to ensure end_time is always after start_time
ALTER TABLE booking_sessions 
ADD CONSTRAINT chk_end_time_after_start_time 
CHECK (end_time > start_time);