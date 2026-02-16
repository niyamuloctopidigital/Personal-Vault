/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Add Missing Index**
     - Add index on `activity_logs.device_id` foreign key for better query performance

  2. **Optimize RLS Policies**
     - Replace all `auth.uid()` calls with `(select auth.uid())` to prevent re-evaluation per row
     - This significantly improves query performance at scale
     - Affected tables: users, devices, activity_logs

  3. **Fix Function Search Path**
     - Update `update_updated_at_column` function with explicit search_path
     - Prevents security vulnerabilities from mutable search paths

  ## Performance Impact
     - RLS queries will now evaluate auth.uid() once per query instead of once per row
     - Foreign key queries on activity_logs will use index instead of full table scan
*/

-- Add missing index on activity_logs.device_id foreign key
CREATE INDEX IF NOT EXISTS idx_activity_logs_device_id ON activity_logs(device_id);

-- Drop existing RLS policies to recreate them with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own devices" ON devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON devices;
DROP POLICY IF EXISTS "Users can update own devices" ON devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON devices;
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_logs;

-- Recreate RLS policies with optimized auth.uid() calls for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Recreate RLS policies with optimized auth.uid() calls for devices table
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Recreate RLS policies with optimized auth.uid() calls for activity_logs table
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Fix function search path vulnerability
-- Drop trigger first, then function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recreate function with fixed search path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();