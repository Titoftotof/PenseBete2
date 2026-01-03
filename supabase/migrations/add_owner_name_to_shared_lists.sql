-- Migration: Add owner_name column to shared_lists
-- This stores the display name of the list owner (denormalized to avoid RLS joins)
-- Execute this in Supabase SQL Editor

-- Add the column
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Note: Existing records will have NULL owner_name
-- New shares will populate this field automatically
