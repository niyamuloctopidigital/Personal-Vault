/*
  # Remove Unused Database Indexes

  ## Changes Made

  1. **Remove Unused Indexes**
     - Drop `idx_devices_user_id` - Redundant with foreign key and unique constraint
     - Drop `idx_devices_fingerprint` - Not used in query patterns (RLS filters by user_id first)
     - Drop `idx_activity_logs_user_id` - Redundant with foreign key constraint
     - Drop `idx_activity_logs_created_at` - Not actively used in queries
     - Drop `idx_activity_logs_device_id` - Not actively used in queries

  ## Performance Impact
     - Reduces index maintenance overhead during INSERT/UPDATE/DELETE operations
     - Improves write performance
     - Reduces storage space usage
     - Foreign key constraints and unique constraints still provide necessary indexing

  ## Notes
     - Foreign keys automatically create indexes for referential integrity
     - The UNIQUE constraint on (user_id, device_fingerprint) provides indexing
     - RLS policies filter by user_id, which uses the foreign key index
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_devices_user_id;
DROP INDEX IF EXISTS idx_devices_fingerprint;
DROP INDEX IF EXISTS idx_activity_logs_user_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_device_id;