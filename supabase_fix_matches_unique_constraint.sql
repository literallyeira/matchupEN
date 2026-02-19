-- Fix: Add unique constraint for matches table
-- Run this in Supabase SQL Editor

-- Step 1: Clean up duplicate records (keep the most recent one)
DELETE FROM matches a
USING matches b
WHERE a.id < b.id 
  AND (
    (a.application_1_id = b.application_1_id AND a.application_2_id = b.application_2_id)
    OR
    (a.application_1_id = b.application_2_id AND a.application_2_id = b.application_1_id)
  );

-- Step 2: Add unique constraint
-- First, drop the constraint if it exists
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_application_1_id_application_2_id_key;

-- Add the unique constraint
ALTER TABLE matches 
ADD CONSTRAINT matches_application_1_id_application_2_id_key UNIQUE (application_1_id, application_2_id);

-- Step 3: Verify the constraint was added
-- You can check with: SELECT * FROM pg_constraint WHERE conname = 'matches_application_1_id_application_2_id_key';

