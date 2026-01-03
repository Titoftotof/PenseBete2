-- Migration: Restore ALL RLS policies for lists, list_items, and shared_lists
-- This script drops and recreates all policies to ensure everything works correctly
-- Execute this in Supabase SQL Editor

-- ============================================================================
-- TABLE: lists
-- ============================================================================

-- Drop all existing policies on lists
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;
DROP POLICY IF EXISTS "Shared users can read lists" ON lists;
DROP POLICY IF EXISTS "Shared users can write lists" ON lists;

-- Policy: Users can manage their own lists (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage their own lists" ON lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Shared users can read lists
CREATE POLICY "Shared users can read lists" ON lists
  FOR SELECT
  TO authenticated
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
  TO authenticated
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

-- ============================================================================
-- TABLE: list_items
-- ============================================================================

-- Drop all existing policies on list_items
DROP POLICY IF EXISTS "Users can manage their own list items" ON list_items;
DROP POLICY IF EXISTS "Shared users can read items" ON list_items;
DROP POLICY IF EXISTS "Shared users can write items" ON list_items;

-- Policy: Users can manage items in their own lists
CREATE POLICY "Users can manage their own list items" ON list_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy: Shared users can read list items
CREATE POLICY "Shared users can read items" ON list_items
  FOR SELECT
  TO authenticated
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

-- Policy: Shared users with write permission can modify items
CREATE POLICY "Shared users can write items" ON list_items
  FOR ALL
  TO authenticated
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

-- ============================================================================
-- Verify policies are created
-- ============================================================================

-- Check policies on lists
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lists'
ORDER BY policyname;

-- Check policies on list_items
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'list_items'
ORDER BY policyname;
