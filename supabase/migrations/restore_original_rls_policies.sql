-- Migration: Restore ALL original RLS policies
-- This script recreates all the original policies that were deleted
-- Execute this in Supabase SQL Editor

-- ============================================================================
-- TABLE: lists - Drop and recreate ALL policies
-- ============================================================================

-- Drop ALL existing policies on lists
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;
DROP POLICY IF EXISTS "Users can create their own lists" ON lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON lists;
DROP POLICY IF EXISTS "Shared users can read lists" ON lists;
DROP POLICY IF EXISTS "Shared users can write lists" ON lists;
DROP POLICY IF EXISTS "Users can view their own lists or lists shared with them" ON lists;

-- Policy: Users can view their own lists
CREATE POLICY "Users can view their own lists" ON lists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own lists
CREATE POLICY "Users can create their own lists" ON lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own lists
CREATE POLICY "Users can update their own lists" ON lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own lists
CREATE POLICY "Users can delete their own lists" ON lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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
-- TABLE: list_items - Drop and recreate ALL policies
-- ============================================================================

-- Drop ALL existing policies on list_items
DROP POLICY IF EXISTS "Users can manage their own list items" ON list_items;
DROP POLICY IF EXISTS "Users can view items from their lists" ON list_items;
DROP POLICY IF EXISTS "Users can create items in their lists" ON list_items;
DROP POLICY IF EXISTS "Users can update items in their lists" ON list_items;
DROP POLICY IF EXISTS "Users can delete items from their lists" ON list_items;
DROP POLICY IF EXISTS "Users can delete items in shared lists with write permission" ON list_items;
DROP POLICY IF EXISTS "Users can view items from shared lists" ON list_items;
DROP POLICY IF EXISTS "Users can view items from their lists or shared lists" ON list_items;
DROP POLICY IF EXISTS "Shared users can read items" ON list_items;
DROP POLICY IF EXISTS "Shared users can write items" ON list_items;

-- Policy: Users can view items from their lists
CREATE POLICY "Users can view items from their lists" ON list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy: Users can create items in their lists
CREATE POLICY "Users can create items in their lists" ON list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy: Users can update items in their lists
CREATE POLICY "Users can update items in their lists" ON list_items
  FOR UPDATE
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

-- Policy: Users can delete items from their lists
CREATE POLICY "Users can delete items from their lists" ON list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy: Shared users can read items
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
-- Verify all policies are created
-- ============================================================================

SELECT '=== POLICIES ON lists ===' as info;
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'lists'
ORDER BY policyname;

SELECT '=== POLICIES ON list_items ===' as info;
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'list_items'
ORDER BY policyname;

SELECT '=== POLICIES ON shared_lists ===' as info;
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'shared_lists'
ORDER BY policyname;
