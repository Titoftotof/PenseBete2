-- Migration: Restore shared_lists table to working state
-- This script restores:
-- 1. The list_name and list_category columns (denormalized to avoid RLS join issues)
-- 2. All RLS policies for sharing functionality
-- Execute this in Supabase SQL Editor

-- Step 1: Add back the denormalized columns
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS list_name TEXT;
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS list_category TEXT;

-- Step 2: Restore data for existing shares (populate from lists table)
UPDATE shared_lists sl
SET list_name = l.name,
    list_category = l.category
FROM lists l
WHERE sl.list_id = l.id
AND (sl.list_name IS NULL OR sl.list_category IS NULL);

-- Step 3: Drop all existing policies on lists and list_items (they may be broken)
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;
DROP POLICY IF EXISTS "Users can manage their own list items" ON list_items;

-- Step 4: Recreate all RLS policies for sharing

-- Policy: Shared users can read lists
CREATE POLICY "Shared users can read lists" ON lists
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_lists
      WHERE shared_lists.list_id = lists.id
      AND (
        shared_lists.shared_with_user_id = auth.uid() OR
        shared_lists.shared_with_email = auth.jwt() ->> 'email'
      )
    )
  );

-- Policy: Shared users with write permission can update lists
CREATE POLICY "Shared users can write lists" ON lists
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_lists
      WHERE shared_lists.list_id = lists.id
      AND shared_lists.permission = 'write'
      AND (
        shared_lists.shared_with_user_id = auth.uid() OR
        shared_lists.shared_with_email = auth.jwt() ->> 'email'
      )
    )
  );

-- Policy: Shared users can read list items
CREATE POLICY "Shared users can read items" ON list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM shared_lists
          WHERE shared_lists.list_id = lists.id
          AND (
            shared_lists.shared_with_user_id = auth.uid() OR
            shared_lists.shared_with_email = auth.jwt() ->> 'email'
          )
        )
      )
    )
  );

-- Policy: Shared users with write can modify items
CREATE POLICY "Shared users can write items" ON list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM shared_lists
          WHERE shared_lists.list_id = lists.id
          AND shared_lists.permission = 'write'
          AND (
            shared_lists.shared_with_user_id = auth.uid() OR
            shared_lists.shared_with_email = auth.jwt() ->> 'email'
          )
        )
      )
    )
  );
