-- Chat System Migration
-- Creates all necessary tables for the chat functionality

-- Conversations table - stores chat conversations between mentors and learners
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" SERIAL PRIMARY KEY,
  "mentor_id" INTEGER NOT NULL REFERENCES "mentors"("id"),
  "learner_id" INTEGER NOT NULL REFERENCES "learners"("id"),
  "mentor_last_read_at" TIMESTAMP WITH TIME ZONE,
  "learner_last_read_at" TIMESTAMP WITH TIME ZONE,
  "last_message_at" TIMESTAMP WITH TIME ZONE,
  "is_active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for unique mentor-learner pairs and faster lookups
CREATE INDEX IF NOT EXISTS "conversations_mentor_learner_idx" ON "conversations" ("mentor_id", "learner_id");

-- Messages table - stores individual messages within conversations
CREATE TABLE IF NOT EXISTS "messages" (
  "id" SERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "content" TEXT NOT NULL,
  "message_type" VARCHAR(20) DEFAULT 'text' NOT NULL,
  "edited_at" TIMESTAMP WITH TIME ZONE,
  "is_globally_deleted" BOOLEAN DEFAULT false NOT NULL,
  "globally_deleted_at" TIMESTAMP WITH TIME ZONE,
  "reply_to_message_id" INTEGER REFERENCES "messages"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster message queries
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_sender_idx" ON "messages" ("sender_id");

-- Message attachments table - stores file attachments for messages
CREATE TABLE IF NOT EXISTS "message_attachments" (
  "id" SERIAL PRIMARY KEY,
  "message_id" INTEGER NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "original_filename" VARCHAR(255) NOT NULL,
  "system_filename" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(512) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "storage_path" VARCHAR(512),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message user deletions table - tracks per-user message deletions
CREATE TABLE IF NOT EXISTS "message_user_deletions" (
  "id" SERIAL PRIMARY KEY,
  "message_id" INTEGER NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "deleted_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for message-user deletions
CREATE INDEX IF NOT EXISTS "message_user_deletions_unique_idx" ON "message_user_deletions" ("message_id", "user_id");

-- Conversation user deletions table - tracks per-user conversation deletions
CREATE TABLE IF NOT EXISTS "conversation_user_deletions" (
  "id" SERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "deleted_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for conversation-user deletions
CREATE INDEX IF NOT EXISTS "conversation_user_deletions_unique_idx" ON "conversation_user_deletions" ("conversation_id", "user_id");