/*
  # Add Missing INSERT Policy for Users Table

  ## Changes Made

  1. **Add INSERT Policy for Users Table**
     - Allow authenticated users to create their own profile in the users table
     - This is required when a new user signs up
     - Uses optimized `(select auth.uid())` for better performance

  ## Security
     - Users can only insert a row with their own auth.uid() as the id
     - Prevents users from creating profiles for other users
*/

-- Add INSERT policy for users table
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));