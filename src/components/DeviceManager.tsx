import { useState, useEffect } from 'react';
import { ArrowLeft, HardDrive, CheckCircle, AlertCircle, XCircle, Shield, RefreshCw } from 'lucide-react';
import { Device } from '../utils/supabase';
import { authService } from '../utils/authService';

interface DeviceManagerProps {
  userId: string;
  currentDeviceId: string;
  onBack: () => void;
}

export function DeviceManager({ userId, currentDeviceId, onBack }: DeviceManagerProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const loadDevices = async () => {
    try {
      const data = await authService.getDevices(userId);
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await authService.getDevices(userId);
      setDevices(data);
      setMessage({ text: 'Devices refreshed', type: 'success' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
      setMessage({ text: 'Failed to refresh', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAuthorize = async (deviceId: string) => {
    const success = await authService.authorizeDevice(deviceId);
    if (success) {
      setMessage({ text: 'Device authorized successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
      loadDevices();
    } else {
      setMessage({ text: 'Failed to authorize device', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (deviceId === currentDeviceId) {
      setMessage({ text: 'Cannot revoke current device', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const success = await authService.revokeDevice(deviceId);
    if (success) {
      setMessage({ text: 'Device revoked successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
      loadDevices();
    } else {
      setMessage({ text: 'Failed to revoke device', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const authorizedDevices = devices.filter(d => d.is_authorized);
  const pendingDevices = devices.filter(d => !d.is_authorized);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Vault
        </button>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Device Management</h1>
            <p className="text-slate-400">
              {authorizedDevices.length} authorized, {pendingDevices.length} pending approval
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-lg hover:bg-slate-700/50 text-white rounded-lg transition-all border border-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading devices...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {authorizedDevices.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Authorized Devices</h2>
                <div className="grid gap-4">
                  {authorizedDevices.map((device) => {
                    const isCurrentDevice = device.id === currentDeviceId;

                    return (
                      <div
                        key={device.id}
                        className={`bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 border shadow-xl ${
                          isCurrentDevice ? 'border-green-500/50 shadow-green-500/10' : 'border-slate-700/50'
                        } hover:bg-slate-800/40 transition-all`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${isCurrentDevice ? 'bg-green-500/10' : 'bg-slate-900/50'}`}>
                            <HardDrive className={`w-8 h-8 ${isCurrentDevice ? 'text-green-400' : 'text-slate-400'}`} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-white">{device.device_name}</h3>
                              {isCurrentDevice && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  Current Device
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 w-32">Fingerprint:</span>
                                <span className="text-slate-200 font-mono">{device.device_fingerprint.substring(0, 16)}...</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 w-32">Registered:</span>
                                <span className="text-slate-200">{new Date(device.created_at).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 w-32">Last Access:</span>
                                <span className="text-slate-200">{new Date(device.last_access).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {!isCurrentDevice && (
                            <button
                              onClick={() => handleRevoke(device.id)}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pendingDevices.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Pending Authorization</h2>
                <div className="grid gap-4">
                  {pendingDevices.map((device) => (
                    <div
                      key={device.id}
                      className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 border border-amber-500/50 shadow-xl shadow-amber-500/10 hover:bg-slate-800/40 hover:border-amber-500/60 transition-all animate-pulse-slow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/10">
                          <AlertCircle className="w-8 h-8 text-amber-400" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2">{device.device_name}</h3>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 w-32">Fingerprint:</span>
                              <span className="text-slate-200 font-mono">{device.device_fingerprint.substring(0, 16)}...</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 w-32">Requested:</span>
                              <span className="text-slate-200">{new Date(device.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAuthorize(device.id)}
                            className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Authorize
                          </button>
                          <button
                            onClick={() => handleRevoke(device.id)}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-xl p-6 shadow-xl">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-blue-300 font-semibold mb-2">Multi-Device Authentication</h3>
              <p className="text-blue-200/90 text-sm leading-relaxed">
                When you try to access your vault from a new device, it will appear here for authorization. Only authorized devices can decrypt and access your vault data. You can revoke access from any device at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
