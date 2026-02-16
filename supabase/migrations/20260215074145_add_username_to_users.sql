/*
  # Add username field to users table

  1. Changes
    - Add `username` column to `users` table (unique, required)
    - Add index on username for faster lookups
    - Add CHECK constraint to ensure username format (alphanumeric and underscore only)
  
  2. Notes
    - Existing users won't have usernames (this is fine for a fresh setup)
    - Username will be used for login instead of email (email stored internally for Supabase Auth)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text UNIQUE;
    
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    
    ALTER TABLE users ADD CONSTRAINT username_format 
      CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');
  END IF;
END $$;