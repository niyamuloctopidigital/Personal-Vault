/*
  # Add DELETE Policy for Activity Logs

  1. Security Change
    - Add DELETE policy for activity_logs table
    - Allows users to delete their own activity logs
    - Users can only delete logs where user_id matches their authenticated user ID

  2. Notes
    - This fixes the "Clear All" functionality in Activity Logs
    - RLS was blocking DELETE operations because no DELETE policy existed
    - Users can now manage their own activity history
*/

-- Add DELETE policy for activity_logs
CREATE POLICY "Users can delete own activity logs"
  ON activity_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());