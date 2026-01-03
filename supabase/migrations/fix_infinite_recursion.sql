-- Migration: Fix infinite recursion by adding owner_id to shared_lists
-- This avoids the circular dependency in RLS policies
-- Execute this in Supabase SQL Editor

-- Step 1: Add owner_id column to shared_lists (denormalized to avoid join)
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Populate owner_id for existing records
UPDATE shared_lists sl
SET owner_id = l.user_id
FROM lists l
WHERE sl.list_id = l.id
AND sl.owner_id IS NULL;

-- Step 3: Drop the problematic policy on shared_lists
DROP POLICY IF EXISTS "Owner can manage shares" ON shared_lists;

-- Step 4: Recreate the policy WITHOUT joining with lists
CREATE POLICY "Owner can manage shares" ON shared_lists
  FOR ALL
  USING (
    owner_id = auth.uid()
  );

-- Step 5: Update the shareList logic to populate owner_id
-- This needs to be done in the application code when inserting

-- Verify the policy
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'shared_lists'
ORDER BY policyname;
