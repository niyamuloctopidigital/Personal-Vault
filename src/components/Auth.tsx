import { useState } from 'react';
import { Shield, Lock, FileKey, AlertTriangle } from 'lucide-react';

interface AuthProps {
  onCreateVault: (password: string, deviceName: string) => Promise<void>;
  onOpenVault: (password: string) => Promise<void>;
  isLocked?: boolean;
  lockTimeRemaining?: number;
  error?: string;
}

export function Auth({ onCreateVault, onOpenVault, isLocked, lockTimeRemaining, error }: AuthProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'open'>('select');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password.length < 12) {
      setLocalError('Master password must be at least 12 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (!deviceName.trim()) {
      setLocalError('Please enter a device name');
      return;
    }

    setLoading(true);
    try {
      await onCreateVault(password, deviceName.trim());
      setPassword('');
      setConfirmPassword('');
      setDeviceName('');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!password) {
      setLocalError('Please enter your master password');
      return;
    }

    setLoading(true);
    try {
      await onOpenVault(password);
      setPassword('');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-red-500/20 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-4 text-red-400">Vault Locked</h1>
          <p className="text-slate-300 text-center mb-6">
            Too many failed attempts. The vault is locked for security.
          </p>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm mb-2">Time remaining:</p>
            <p className="text-3xl font-bold text-red-400">{lockTimeRemaining} minutes</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-full mb-4">
              <Shield className="w-16 h-16 text-blue-400" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Ironclad Local Vault</h1>
            <p className="text-slate-400 text-lg">Hardware-Bound Encryption for Maximum Security</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('create')}
              className="group bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                  <FileKey className="w-10 h-10 text-blue-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create New Vault</h2>
              <p className="text-slate-400">Start fresh with a new encrypted vault file</p>
            </button>

            <button
              onClick={() => setMode('open')}
              className="group bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 hover:border-green-500 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                  <Lock className="w-10 h-10 text-green-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Open Existing Vault</h2>
              <p className="text-slate-400">Unlock your existing vault file</p>
            </button>
          </div>

          <div className="mt-12 bg-slate-800/30 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Security Features:</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Hardware-bound encryption prevents theft</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>AES-256-GCM with 700,000 PBKDF2 iterations</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Auto-lock after 3 failed password attempts</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>100% local, zero cloud dependency</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode('select')}
            className="text-slate-400 hover:text-white mb-6 flex items-center"
          >
            ← Back
          </button>

          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <FileKey className="w-12 h-12 text-blue-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-6 text-white">Create New Vault</h1>

            {(error || localError) && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error || localError}</p>
              </div>
            )}

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., My Laptop"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 12 characters"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-400 text-xs font-medium mb-1">WARNING</p>
                <p className="text-amber-300 text-xs">
                  There is NO password recovery. If you forget your master password, your data is
                  permanently lost. Write it down securely.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Creating...' : 'Create Vault'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => setMode('select')}
          className="text-slate-400 hover:text-white mb-6 flex items-center"
        >
          ← Back
        </button>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-green-500/10 rounded-full">
              <Lock className="w-12 h-12 text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-6 text-white">Open Vault</h1>

          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error || localError}</p>
            </div>
          )}

          <form onSubmit={handleOpenVault} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Master Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your master password"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Unlocking...' : 'Unlock Vault'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
