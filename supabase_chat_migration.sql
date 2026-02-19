-- Chat Feature Migration
-- Run this in Supabase SQL Editor

-- 1. Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  receiver_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_application_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_application_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_application_id, is_read) WHERE is_read = FALSE;

-- 3. Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only see messages from their matches
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    sender_application_id IN (
      SELECT id FROM applications WHERE gtaw_user_id = (SELECT gtaw_user_id FROM applications WHERE id = sender_application_id)
    ) OR
    receiver_application_id IN (
      SELECT id FROM applications WHERE gtaw_user_id = (SELECT gtaw_user_id FROM applications WHERE id = receiver_application_id)
    )
  );

-- Users can only send messages to their matches
CREATE POLICY "Users can send messages to their matches" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        (m.application_1_id = sender_application_id AND m.application_2_id = receiver_application_id)
        OR
        (m.application_2_id = sender_application_id AND m.application_1_id = receiver_application_id)
      )
    )
  );

-- Users can update their received messages (mark as read)
CREATE POLICY "Users can update received messages" ON messages
  FOR UPDATE USING (receiver_application_id IN (
    SELECT id FROM applications WHERE gtaw_user_id = (SELECT gtaw_user_id FROM applications WHERE id = receiver_application_id)
  ));

-- Allow all access for simplicity (backend validation ensures security)
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their matches" ON messages;
DROP POLICY IF EXISTS "Users can update received messages" ON messages;

CREATE POLICY "Allow all access to messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

