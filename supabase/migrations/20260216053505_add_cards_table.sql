/*
  # Add Cards Storage System

  1. New Tables
    - `cards`
      - `id` (uuid, primary key) - Unique card identifier
      - `user_id` (uuid, foreign key) - Owner of the card
      - `folder_id` (text, nullable) - Parent folder ID for organization (references client-side vault)
      - `card_name` (text) - Custom name/label for the card
      - `card_holder` (text) - Name on the card
      - `card_number` (text) - Encrypted card number
      - `expiry_month` (text) - Expiry month (MM)
      - `expiry_year` (text) - Expiry year (YYYY)
      - `cvv` (text) - Encrypted CVV
      - `card_type` (text) - Type: credit, debit, prepaid
      - `company` (text) - Card issuer/company (Visa, Mastercard, Amex, etc.)
      - `billing_address` (text, nullable) - Billing address
      - `notes` (text, nullable) - Additional notes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `cards` table
    - Add policy for authenticated users to read their own cards
    - Add policy for authenticated users to insert their own cards
    - Add policy for authenticated users to update their own cards
    - Add policy for authenticated users to delete their own cards

  3. Indexes
    - Index on user_id for fast user queries
    - Index on folder_id for folder filtering
    - Index on card_type for filtering by type
*/

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id text,
  card_name text NOT NULL,
  card_holder text NOT NULL,
  card_number text NOT NULL,
  expiry_month text NOT NULL,
  expiry_year text NOT NULL,
  cvv text NOT NULL,
  card_type text NOT NULL DEFAULT 'credit',
  company text NOT NULL,
  billing_address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own cards"
  ON cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON cards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON cards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_folder_id ON cards(folder_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_cards_updated_at();