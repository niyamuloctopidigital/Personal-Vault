import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  master_password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string;
  is_authorized: boolean;
  last_access: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  device_id: string | null;
  action_type: string;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}
