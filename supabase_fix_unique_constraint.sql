-- Fix: Add unique constraint for gtaw_user_id and character_id
-- Run this in Supabase SQL Editor

-- Step 1: Clean up duplicate records (keep the most recent one)
DELETE FROM applications a
USING applications b
WHERE a.id < b.id 
  AND a.gtaw_user_id = b.gtaw_user_id 
  AND a.character_id = b.character_id
  AND a.gtaw_user_id IS NOT NULL 
  AND a.character_id IS NOT NULL;

-- Step 2: Add unique constraint
-- First, drop the constraint if it exists
ALTER TABLE applications DROP CONSTRAINT IF EXISTS unique_user_character;

-- Add the unique constraint
ALTER TABLE applications 
ADD CONSTRAINT unique_user_character UNIQUE (gtaw_user_id, character_id);

-- Step 3: Verify the constraint was added
-- You can check with: SELECT * FROM pg_constraint WHERE conname = 'unique_user_character';

