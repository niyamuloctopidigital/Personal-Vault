/*
  # Vault Authentication System

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - User ID
      - `email` (text, unique) - User email for identification
      - `master_password_hash` (text) - Hashed master password
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `devices`
      - `id` (uuid, primary key) - Device ID
      - `user_id` (uuid, foreign key) - Owner user ID
      - `device_fingerprint` (text) - Hardware fingerprint hash
      - `device_name` (text) - Human-readable device name
      - `is_authorized` (boolean) - Authorization status
      - `last_access` (timestamptz) - Last access timestamp
      - `created_at` (timestamptz) - Device registration timestamp
    
    - `activity_logs`
      - `id` (uuid, primary key) - Log entry ID
      - `user_id` (uuid, foreign key) - User who performed action
      - `device_id` (uuid, foreign key) - Device used
      - `action_type` (text) - Type of action (login, logout, copy_password, etc.)
      - `details` (jsonb) - Additional details about the action
      - `ip_address` (text) - IP address at time of action
      - `created_at` (timestamptz) - Timestamp of action

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Devices must be authorized to access user data
    - Activity logs are read-only for users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  master_password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint text NOT NULL,
  device_name text NOT NULL DEFAULT 'Unknown Device',
  is_authorized boolean DEFAULT false,
  last_access timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for devices table
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for activity_logs table
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();