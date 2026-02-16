/*
  # Add Indexes for Foreign Keys on Activity Logs Table

  ## Changes Made

  1. **Add Foreign Key Indexes**
     - Add index on `activity_logs.user_id` foreign key
     - Add index on `activity_logs.device_id` foreign key

  ## Performance Impact
     - Improves JOIN performance when querying activity logs with users or devices
     - Speeds up CASCADE DELETE operations
     - Optimizes queries that filter activity logs by user_id or device_id
     - Essential for foreign key constraint enforcement performance

  ## Notes
     - Foreign key indexes are critical for referential integrity performance
     - These indexes support the RLS policies that filter by user_id
     - Helps with queries that join activity_logs with devices or users tables
*/

-- Add index for activity_logs.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Add index for activity_logs.device_id foreign key
CREATE INDEX IF NOT EXISTS idx_activity_logs_device_id ON activity_logs(device_id);