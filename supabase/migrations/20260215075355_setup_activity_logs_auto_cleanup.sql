/*
  # Setup automatic activity logs cleanup

  1. Configuration
    - Enable pg_cron extension for scheduled tasks
    - Create a cron job to delete activity logs older than 7 days
    - Runs daily at 2:00 AM UTC
  
  2. Cleanup Logic
    - Deletes all activity_logs records where created_at is older than 7 days
    - Helps keep database clean and performant
    - Runs automatically without manual intervention
  
  3. Notes
    - The cleanup preserves recent activity for security auditing
    - Older logs are automatically purged to save space
    - Cron job runs daily to ensure consistent cleanup
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to clean up old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Cleaned up activity logs older than 7 days';
END;
$$;

-- Schedule the cleanup to run daily at 2:00 AM UTC
-- First, unschedule any existing job with the same name to avoid duplicates
SELECT cron.unschedule('cleanup-old-activity-logs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-activity-logs'
);

-- Schedule the new job
SELECT cron.schedule(
  'cleanup-old-activity-logs',
  '0 2 * * *',
  'SELECT cleanup_old_activity_logs();'
);