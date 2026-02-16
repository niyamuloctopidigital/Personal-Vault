import { useState, useEffect } from 'react';
import { Shield, FolderPlus, FolderOpen, Lock, AlertTriangle, Fingerprint, Mail } from 'lucide-react';
import { authService, AuthUser } from '../utils/authService';
import { RecoveryCodes } from './RecoveryCodes';
import { generateRecoveryCodes, saveRecoveryCodes, validateRecoveryCode } from '../utils/recoveryCodes';

interface LoginRegisterProps {
  onAuthenticated: (user: AuthUser) => void;
}

export function LoginRegister({ onAuthenticated }: LoginRegisterProps) {
  const [mode, setMode] = useState<'select' | 'open' | 'create'>('select');
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [deviceRecognized, setDeviceRecognized] = useState<boolean | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const checkLockStatus = () => {
    if (lockUntil && Date.now() < lockUntil) {
      const minutesRemaining = Math.ceil((lockUntil - Date.now()) / (1000 * 60));
      return minutesRemaining;
    }
    return 0;
  };

  useEffect(() => {
    if (mode === 'open') {
      checkDevice();
    }
  }, [mode]);

  const checkDevice = async () => {
    setCheckingDevice(true);
    try {
      const result = await authService.checkDeviceRecognition();
      setDeviceRecognized(result.recognized);
      if (result.email) {
        setEmail(result.email);
      }
    } catch (err) {
      setDeviceRecognized(false);
    } finally {
      setCheckingDevice(false);
    }
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (masterPassword.length < 12) {
      setError('Master password must be at least 12 characters');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.createVault(email, masterPassword);

      if (!result.success) {
        setError(result.error || 'Failed to create vault');
      } else if (result.user) {
        const codes = await generateRecoveryCodes(10);
        const saved = await saveRecoveryCodes(result.user.id, codes);

        if (!saved) {
          setError('Failed to generate recovery codes. Please try again.');
          return;
        }

        setPendingUser(result.user);
        setRecoveryCodes(codes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const minutesLocked = checkLockStatus();
    if (minutesLocked > 0) {
      setError(`Vault locked. Try again in ${minutesLocked} minutes`);
      return;
    }

    if (!deviceRecognized && (!email || !email.includes('@'))) {
      setError('Please enter a valid email address');
      return;
    }

    if (!masterPassword) {
      setError('Please enter your master password');
      return;
    }

    if (showRecoveryCode && !recoveryCode) {
      setError('Please enter a recovery code');
      return;
    }

    setLoading(true);
    try {
      const result = deviceRecognized
        ? await authService.quickOpenVault(masterPassword)
        : await authService.openVault(email, masterPassword);

      if (!result.success) {
        if (result.needsDeviceApproval) {
          if (showRecoveryCode && recoveryCode) {
            const userResult = await authService.openVault(email, masterPassword);
            if (userResult.user) {
              const isValid = await validateRecoveryCode(userResult.user.id, recoveryCode);

              if (isValid) {
                const { generateDeviceFingerprint } = await import('../utils/fingerprint');
                const { supabase } = await import('../utils/supabase');
                const fingerprintData = await generateDeviceFingerprint();
                const { data: device } = await supabase
                  .from('devices')
                  .select('id')
                  .eq('user_id', userResult.user.id)
                  .eq('device_fingerprint', fingerprintData.hash)
                  .maybeSingle();

                if (device) {
                  await authService.authorizeDevice(device.id);
                  const finalResult = await authService.openVault(email, masterPassword);
                  if (finalResult.success && finalResult.user) {
                    setFailedAttempts(0);
                    onAuthenticated(finalResult.user);
                    return;
                  }
                }
              } else {
                setError('Invalid recovery code');
                setLoading(false);
                return;
              }
            }
          }
          setError(result.error || 'Device needs approval. Use a recovery code or authorize from another device.');
        } else {
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);

          if (newFailedAttempts >= 3) {
            const lockTime = Date.now() + (30 * 60 * 1000);
            setLockUntil(lockTime);
            setError('Too many failed attempts. Vault locked for 30 minutes.');
          } else {
            setError(`${result.error}. ${3 - newFailedAttempts} attempts remaining.`);
          }
        }
      } else if (result.user) {
        setFailedAttempts(0);
        onAuthenticated(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open vault');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryCodesComplete = () => {
    if (pendingUser) {
      onAuthenticated(pendingUser);
    }
  };

  if (recoveryCodes.length > 0 && pendingUser) {
    return <RecoveryCodes codes={recoveryCodes} onComplete={handleRecoveryCodesComplete} />;
  }

  const minutesLocked = checkLockStatus();
  if (minutesLocked > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-500/30 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-4 text-red-400">Vault Locked</h1>
          <p className="text-slate-300 text-center mb-6">
            Too many failed attempts. Your vault is temporarily locked for security.
          </p>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm mb-2">Time remaining:</p>
            <p className="text-3xl font-bold text-red-400">{minutesLocked} minutes</p>
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
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full mb-4">
              <Shield className="w-16 h-16 text-emerald-400" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Ironclad Vault</h1>
            <p className="text-slate-400 text-lg">Your Personal Password Vault</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('create')}
              className="group bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/70 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:bg-slate-800/40"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                  <FolderPlus className="w-10 h-10 text-blue-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create New Vault</h2>
              <p className="text-slate-400">Set up a new password vault</p>
            </button>

            <button
              onClick={() => setMode('open')}
              className="group bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 hover:border-emerald-500/70 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 hover:bg-slate-800/40"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                  <FolderOpen className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Open Existing Vault</h2>
              <p className="text-slate-400">Access your password vault</p>
            </button>
          </div>

          <div className="mt-12 bg-slate-800/20 backdrop-blur-xl rounded-xl p-6 border border-slate-700/40 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Security Features:</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>Device fingerprinting for secure, password-only access on trusted devices</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>AES-256-GCM encryption with 600,000 PBKDF2 iterations</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>One-time recovery codes for device loss scenarios</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>Multi-device sync with authorization controls</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>Complete activity logging and device management</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-400 mr-2">•</span>
                <span>Auto-lock after 3 failed attempts (30 minute lockout)</span>
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

          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <FolderPlus className="w-12 h-12 text-blue-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-6 text-white">Create New Vault</h1>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
                <p className="text-xs text-slate-400 mt-1">Used only for vault identification and device recovery</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Master Password
                </label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
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
                <p className="text-amber-400 text-xs font-medium mb-1">IMPORTANT</p>
                <p className="text-amber-300 text-xs">
                  This device will be automatically authorized. On other devices, you'll need to provide your email and password for first-time access.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Creating Vault...' : 'Create Vault'}
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
            <div className="p-4 bg-emerald-500/10 rounded-full">
              <FolderOpen className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-6 text-white">Open Vault</h1>

          {checkingDevice && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm flex items-center">
                <Fingerprint className="w-4 h-4 mr-2 animate-pulse" />
                Checking device recognition...
              </p>
            </div>
          )}

          {!checkingDevice && deviceRecognized && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 text-sm flex items-center">
                <Fingerprint className="w-4 h-4 mr-2" />
                Device recognized! Enter your master password.
              </p>
            </div>
          )}

          {!checkingDevice && deviceRecognized === false && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-400 text-sm">
                New device detected. Please enter your email and master password.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleOpenVault} className="space-y-4">
            {!deviceRecognized && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="your@email.com"
                  disabled={loading || checkingDevice}
                  autoComplete="email"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Master Password
              </label>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your master password"
                disabled={loading || checkingDevice}
                autoFocus
              />
            </div>

            {showRecoveryCode && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  disabled={loading || checkingDevice}
                />
                <p className="text-xs text-slate-400 mt-1">Enter one of your recovery codes to authorize this device</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRecoveryCode(!showRecoveryCode)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {showRecoveryCode ? 'Hide recovery code' : 'Lost all devices? Use recovery code'}
            </button>

            <button
              type="submit"
              disabled={loading || checkingDevice}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Opening Vault...' : 'Open Vault'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
