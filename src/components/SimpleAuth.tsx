import { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, HardDrive, AlertCircle } from 'lucide-react';
import { getOrCreateDeviceId, getDeviceName } from '../utils/deviceId';

interface SimpleAuthProps {
  onUnlock: (masterPassword: string, createNew: boolean) => Promise<void>;
  lockStatus?: {
    isLocked: boolean;
    lockUntil: number;
  };
}

export function SimpleAuth({ onUnlock, lockStatus }: SimpleAuthProps) {
  const [masterPassword, setMasterPassword] = useState('');
  const [mode, setMode] = useState<'unlock' | 'create'>('unlock');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({ id: '', name: '' });

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    const id = await getOrCreateDeviceId();
    const name = await getDeviceName();
    setDeviceInfo({ id: id.substring(0, 16) + '...', name });
  };

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!masterPassword) {
      setError('Please enter your master password');
      return;
    }

    if (mode === 'create') {
      if (masterPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (masterPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await onUnlock(masterPassword, mode === 'create');
    } catch (err: any) {
      setError(err.message || 'Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockStatus?.isLocked && lockStatus.lockUntil > Date.now();
  const lockTimeRemaining = isLocked
    ? Math.ceil((lockStatus!.lockUntil - Date.now()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Ironclad Vault</h1>
          <p className="text-slate-400">Secure Password Manager</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-400 bg-slate-900 rounded-lg p-3">
            <HardDrive className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium text-slate-300">{deviceInfo.name}</div>
              <div className="text-xs">ID: {deviceInfo.id}</div>
            </div>
          </div>

          {isLocked && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Vault Locked</h3>
                  <p className="text-red-300 text-sm">
                    Too many failed attempts. Try again in {lockTimeRemaining} minute{lockTimeRemaining !== 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setMode('unlock')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'unlock'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" />
                Open Vault
              </div>
            </button>
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'create'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Create Vault
              </div>
            </button>
          </div>

          <form onSubmit={handlePasswordUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Master Password
              </label>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                disabled={isLocked || loading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your master password"
                autoFocus
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLocked || loading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Confirm your master password"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {mode === 'create' && (
              <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <p className="text-amber-300 text-sm">
                  <strong>Important:</strong> Your master password encrypts all your data.
                  If you lose it, your data cannot be recovered. Choose a strong, memorable password.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLocked || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-lg"
            >
              {loading ? 'Please wait...' : mode === 'create' ? 'Create Vault' : 'Unlock Vault'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>All data is encrypted locally on your device</p>
            <p className="mt-1">AES-256-GCM • 1,000,000 PBKDF2 iterations</p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Works offline • Sync across devices • Mobile & Desktop</p>
        </div>
      </div>
    </div>
  );
}
