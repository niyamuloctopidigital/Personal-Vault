import { supabase } from './supabase';

export async function generateRecoveryCodes(count: number = 10): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateRandomCode();
    codes.push(code);
  }

  return codes;
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = 4;
  const segmentLength = 4;

  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }).join('-');

  return code;
}

export async function hashCode(code: string): Promise<string> {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function saveRecoveryCodes(userId: string, codes: string[]): Promise<boolean> {
  try {
    const hashedCodes = await Promise.all(codes.map(hashCode));

    const records = hashedCodes.map(hash => ({
      user_id: userId,
      code_hash: hash,
      is_used: false
    }));

    const { error } = await supabase
      .from('recovery_codes')
      .insert(records);

    if (error) {
      console.error('Failed to save recovery codes:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving recovery codes:', error);
    return false;
  }
}

export async function validateRecoveryCode(userId: string, code: string): Promise<boolean> {
  try {
    const hash = await hashCode(code);

    const { data, error } = await supabase
      .from('recovery_codes')
      .select('id, is_used')
      .eq('user_id', userId)
      .eq('code_hash', hash)
      .eq('is_used', false)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('recovery_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('Failed to mark code as used:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating recovery code:', error);
    return false;
  }
}

export async function getUnusedCodeCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('recovery_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_used', false);

    if (error) {
      console.error('Failed to get unused code count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unused code count:', error);
    return 0;
  }
}

export async function regenerateRecoveryCodes(userId: string, count: number = 10): Promise<string[] | null> {
  try {
    const { error: deleteError } = await supabase
      .from('recovery_codes')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to delete old recovery codes:', deleteError);
      return null;
    }

    const codes = await generateRecoveryCodes(count);
    const saved = await saveRecoveryCodes(userId, codes);

    if (!saved) {
      return null;
    }

    return codes;
  } catch (error) {
    console.error('Error regenerating recovery codes:', error);
    return null;
  }
}
