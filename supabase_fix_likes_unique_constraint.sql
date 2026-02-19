-- Fix: Add unique constraint for likes table
-- Run this in Supabase SQL Editor

-- Step 1: Clean up duplicate records (keep the most recent one)
DELETE FROM likes a
USING likes b
WHERE a.id < b.id 
  AND a.from_application_id = b.from_application_id 
  AND a.to_application_id = b.to_application_id;

-- Step 2: Add unique constraint
-- First, drop the constraint if it exists
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_from_application_id_to_application_id_key;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_pkey;

-- Add the unique constraint
ALTER TABLE likes 
ADD CONSTRAINT likes_from_application_id_to_application_id_key UNIQUE (from_application_id, to_application_id);

-- Step 3: Verify the constraint was added
-- You can check with: SELECT * FROM pg_constraint WHERE conname = 'likes_from_application_id_to_application_id_key';

