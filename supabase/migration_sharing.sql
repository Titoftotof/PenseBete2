-- Migration: Add list sharing functionality
-- Execute this in Supabase SQL Editor

-- Create shared_lists table
CREATE TABLE IF NOT EXISTS shared_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, shared_with_email)
);

-- Enable RLS
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Owner can manage shares
CREATE POLICY "Owner can manage shares" ON shared_lists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = shared_lists.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Policy: User can see shares for their email
CREATE POLICY "User can see their shares" ON shared_lists
  FOR SELECT
  USING (
    shared_with_user_id = auth.uid() OR
    shared_with_email = auth.jwt() ->> 'email'
  );

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_lists_list_id ON shared_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_shared_lists_user ON shared_lists(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_lists_email ON shared_lists(shared_with_email);
