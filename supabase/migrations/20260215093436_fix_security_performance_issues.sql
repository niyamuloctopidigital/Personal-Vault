/*
  # Fix Security and Performance Issues

  1. RLS Policy Optimization
    - Recreate recovery_codes policies with optimized `(select auth.uid())` syntax
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Function Security
    - Fix cleanup_old_activity_logs function to use immutable search_path
    - Prevents potential security issues with mutable search paths
    - Sets explicit search_path to public schema

  3. Notes
    - Indexes are kept as they are used by queries (user lookups, code validation)
    - Auth DB connection and leaked password protection require dashboard configuration
*/

-- Drop existing recovery_codes policies
DROP POLICY IF EXISTS "Users can view their own unused recovery codes" ON recovery_codes;
DROP POLICY IF EXISTS "Users can insert their own recovery codes" ON recovery_codes;
DROP POLICY IF EXISTS "Users can mark their own codes as used" ON recovery_codes;

-- Recreate policies with optimized syntax
CREATE POLICY "Users can view their own unused recovery codes"
  ON recovery_codes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own recovery codes"
  ON recovery_codes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can mark their own codes as used"
  ON recovery_codes
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Fix cleanup function with proper search_path
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Cleaned up activity logs older than 7 days';
END;
$$;