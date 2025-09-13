-- Migration: Add conversation_user_deletions table for per-user conversation soft deletes
-- This allows users to individually delete conversations from their view without affecting the other participant

CREATE TABLE IF NOT EXISTS conversation_user_deletions (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate deletions by the same user for the same conversation
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_user_deletions_unique 
ON conversation_user_deletions(conversation_id, user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_user_deletions_conversation_id 
ON conversation_user_deletions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_user_deletions_user_id 
ON conversation_user_deletions(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_user_deletions_deleted_at 
ON conversation_user_deletions(deleted_at);