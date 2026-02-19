-- Fix: Add unique constraint for dislikes table
-- Run this in Supabase SQL Editor

-- Step 1: Clean up duplicate records (keep the most recent one)
DELETE FROM dislikes a
USING dislikes b
WHERE a.id < b.id 
  AND a.from_application_id = b.from_application_id 
  AND a.to_application_id = b.to_application_id;

-- Step 2: Add unique constraint
-- First, drop the constraint if it exists
ALTER TABLE dislikes DROP CONSTRAINT IF EXISTS dislikes_from_application_id_to_application_id_key;

-- Add the unique constraint
ALTER TABLE dislikes 
ADD CONSTRAINT dislikes_from_application_id_to_application_id_key UNIQUE (from_application_id, to_application_id);

-- Step 3: Verify the constraint was added
-- You can check with: SELECT * FROM pg_constraint WHERE conname = 'dislikes_from_application_id_to_application_id_key';

