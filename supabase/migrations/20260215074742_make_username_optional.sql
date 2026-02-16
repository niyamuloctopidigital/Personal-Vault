/*
  # Make username field optional

  1. Changes
    - Remove unique constraint from username
    - Remove CHECK constraint on username format
    - Drop index on username
    - Username is no longer required for vault operation
  
  2. Notes
    - System now uses email as primary identifier
    - Username kept in table for potential future use but not enforced
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'username_format' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT username_format;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_users_username'
  ) THEN
    DROP INDEX idx_users_username;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_username_key' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_username_key;
  END IF;
END $$;