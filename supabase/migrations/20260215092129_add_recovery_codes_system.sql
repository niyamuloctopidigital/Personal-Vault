/*
  # Recovery Codes System

  1. New Tables
    - `recovery_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `code_hash` (text) - Hashed recovery code for security
      - `is_used` (boolean) - Whether the code has been used
      - `used_at` (timestamptz) - When the code was used
      - `created_at` (timestamptz) - When the code was created

  2. Security
    - Enable RLS on `recovery_codes` table
    - Add policy for users to read their own unused codes
    - Add policy for users to update their own codes when using them
    - Add policy for users to insert recovery codes during registration

  3. Indexes
    - Index on user_id for fast lookup
    - Index on code_hash for validation
    - Index on is_used for filtering unused codes

  4. Notes
    - Recovery codes are one-time use only
    - Codes are hashed before storage for security
    - Users should generate 10 codes during vault creation
    - Codes can be used to authorize new devices when all devices are lost
*/

-- Create recovery_codes table
CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  is_used boolean DEFAULT false NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

-- Policies for recovery_codes
CREATE POLICY "Users can view their own unused recovery codes"
  ON recovery_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery codes"
  ON recovery_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can mark their own codes as used"
  ON recovery_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id 
  ON recovery_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_code_hash 
  ON recovery_codes(code_hash);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_unused 
  ON recovery_codes(user_id, is_used) 
  WHERE is_used = false;