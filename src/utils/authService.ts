import { supabase } from './supabase';
import { hashPassword } from './crypto';
import { generateDeviceFingerprint } from './fingerprint';

export interface AuthUser {
  id: string;
  email: string;
  deviceId: string;
  deviceFingerprint: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  needsDeviceApproval?: boolean;
}

export const authService = {
  async checkDeviceRecognition(): Promise<{ recognized: boolean; email?: string; error?: string }> {
    try {
      const fingerprintData = await generateDeviceFingerprint();
      const fingerprint = fingerprintData.hash;

      const { data: devices, error } = await supabase
        .from('devices')
        .select('id, user_id, is_authorized, users(email)')
        .eq('device_fingerprint', fingerprint)
        .eq('is_authorized', true)
        .limit(1);

      if (error) {
        return { recognized: false, error: error.message };
      }

      if (devices && devices.length > 0 && devices[0].users) {
        return { recognized: true, email: (devices[0].users as any).email };
      }

      return { recognized: false };
    } catch (error: any) {
      return { recognized: false, error: error.message };
    }
  },

  async quickOpenVault(masterPassword: string): Promise<AuthResult> {
    try {
      const deviceCheck = await this.checkDeviceRecognition();

      if (!deviceCheck.recognized || !deviceCheck.email) {
        return { success: false, error: 'Device not recognized. Please provide your email address.' };
      }

      return await this.openVault(deviceCheck.email, masterPassword);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createVault(email: string, masterPassword: string): Promise<AuthResult> {
    try {
      const passwordHash = await hashPassword(masterPassword);
      const fingerprintData = await generateDeviceFingerprint();
      const fingerprint = fingerprintData.hash;

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        return { success: false, error: 'Database error: ' + checkError.message };
      }

      if (existingUser) {
        return { success: false, error: 'A vault with this email already exists' };
      }

      const supabaseAuthResult = await supabase.auth.signUp({
        email,
        password: masterPassword,
        options: {
          data: {
            master_password_hash: passwordHash,
          }
        }
      });

      if (supabaseAuthResult.error) {
        if (supabaseAuthResult.error.message.includes('already registered') ||
            supabaseAuthResult.error.message.includes('already exists')) {
          const signInResult = await supabase.auth.signInWithPassword({
            email,
            password: masterPassword,
          });

          if (signInResult.error || !signInResult.data.user) {
            return { success: false, error: 'User already registered. Please try logging in instead.' };
          }

          const userId = signInResult.data.user.id;

          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (existingProfile) {
            return { success: false, error: 'User already registered. Please use the login page instead.' };
          }

          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email,
              master_password_hash: passwordHash,
            })
            .select()
            .single();

          if (userError) {
            await supabase.auth.signOut();
            return { success: false, error: 'Failed to complete vault creation. Please try again.' };
          }

          const deviceName = `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`;

          const { data: device, error: deviceError } = await supabase
            .from('devices')
            .insert({
              user_id: userId,
              device_fingerprint: fingerprint,
              device_name: deviceName,
              is_authorized: true,
            })
            .select()
            .single();

          if (deviceError) {
            await supabase.auth.signOut();
            return { success: false, error: 'Failed to register device.' };
          }

          await supabase
            .from('activity_logs')
            .insert({
              user_id: userId,
              device_id: device.id,
              action_type: 'vault_created',
              details: { email, device_name: deviceName },
            });

          return {
            success: true,
            user: {
              id: userId,
              email,
              deviceId: device.id,
              deviceFingerprint: fingerprint,
            },
          };
        }
        return { success: false, error: supabaseAuthResult.error.message };
      }

      if (!supabaseAuthResult.data.user) {
        return { success: false, error: 'Failed to create user' };
      }

      const userId = supabaseAuthResult.data.user.id;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          master_password_hash: passwordHash,
        })
        .select()
        .single();

      if (userError) {
        return { success: false, error: 'Failed to create vault: ' + userError.message };
      }

      const deviceName = `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`;

      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .insert({
          user_id: userId,
          device_fingerprint: fingerprint,
          device_name: deviceName,
          is_authorized: true,
        })
        .select()
        .single();

      if (deviceError) {
        return { success: false, error: 'Failed to register device: ' + deviceError.message };
      }

      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          device_id: device.id,
          action_type: 'vault_created',
          details: { email, device_name: deviceName },
        });

      return {
        success: true,
        user: {
          id: userId,
          email,
          deviceId: device.id,
          deviceFingerprint: fingerprint,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async openVault(email: string, masterPassword: string): Promise<AuthResult> {
    try {
      const passwordHash = await hashPassword(masterPassword);
      const fingerprintData = await generateDeviceFingerprint();
      const fingerprint = fingerprintData.hash;

      const authResult = await supabase.auth.signInWithPassword({
        email,
        password: masterPassword,
      });

      if (authResult.error) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: null,
            device_id: null,
            action_type: 'vault_open_failed',
            details: { email, reason: 'Invalid credentials' },
          });

        return { success: false, error: 'Invalid email or password' };
      }

      const userId = authResult.data.user.id;

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !user) {
        return { success: false, error: 'User not found' };
      }

      if (user.master_password_hash !== passwordHash) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            device_id: null,
            action_type: 'vault_open_failed',
            details: { email, reason: 'Invalid master password' },
          });

        return { success: false, error: 'Invalid master password' };
      }

      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_fingerprint', fingerprint)
        .maybeSingle();

      if (deviceError) {
        return { success: false, error: 'Device lookup error: ' + deviceError.message };
      }

      if (!device) {
        const deviceName = `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`;

        const { data: newDevice } = await supabase
          .from('devices')
          .insert({
            user_id: userId,
            device_fingerprint: fingerprint,
            device_name: deviceName,
            is_authorized: true,
          })
          .select()
          .single();

        if (!newDevice) {
          return { success: false, error: 'Failed to register new device' };
        }

        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            device_id: newDevice.id,
            action_type: 'new_device_auto_authorized',
            details: { email, device_name: deviceName },
          });

        await supabase
          .from('devices')
          .update({ last_access: new Date().toISOString() })
          .eq('id', newDevice.id);

        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            device_id: newDevice.id,
            action_type: 'vault_opened',
            details: { email },
          });

        return {
          success: true,
          user: {
            id: userId,
            email,
            deviceId: newDevice.id,
            deviceFingerprint: fingerprint,
          },
        };
      }

      if (!device.is_authorized) {
        const { error: authError } = await supabase
          .from('devices')
          .update({ is_authorized: true })
          .eq('id', device.id);

        if (authError) {
          return { success: false, error: 'Failed to authorize device' };
        }

        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            device_id: device.id,
            action_type: 'device_auto_authorized',
            details: { email },
          });
      }

      await supabase
        .from('devices')
        .update({ last_access: new Date().toISOString() })
        .eq('id', device.id);

      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          device_id: device.id,
          action_type: 'vault_opened',
          details: { email },
        });

      return {
        success: true,
        user: {
          id: userId,
          email,
          deviceId: device.id,
          deviceFingerprint: fingerprint,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async logout(userId: string, deviceId: string): Promise<void> {
    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          device_id: deviceId,
          action_type: 'logout',
          details: {},
        });

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getDevices(userId: string) {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async authorizeDevice(deviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ is_authorized: true })
        .eq('id', deviceId);

      if (error) throw error;

      const { data: device } = await supabase
        .from('devices')
        .select('user_id')
        .eq('id', deviceId)
        .single();

      if (device) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: device.user_id,
            device_id: deviceId,
            action_type: 'device_authorized',
            details: {},
          });
      }

      return true;
    } catch (error) {
      console.error('Authorization error:', error);
      return false;
    }
  },

  async revokeDevice(deviceId: string): Promise<boolean> {
    try {
      const { data: device } = await supabase
        .from('devices')
        .select('user_id')
        .eq('id', deviceId)
        .single();

      if (device) {
        await supabase
          .from('activity_logs')
          .insert({
            user_id: device.user_id,
            device_id: deviceId,
            action_type: 'device_revoked',
            details: {},
          });
      }

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Revoke error:', error);
      return false;
    }
  },

  async logActivity(userId: string, deviceId: string, actionType: string, details: Record<string, any> = {}) {
    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          device_id: deviceId,
          action_type: actionType,
          details,
        });
    } catch (error) {
      console.error('Activity log error:', error);
    }
  },

  async getActivityLogs(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        devices (device_name, device_fingerprint)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async clearActivityLogs(userId: string) {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Clear activity logs error:', error);
      return false;
    }
  },
};
