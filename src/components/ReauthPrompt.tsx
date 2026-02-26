import { useState } from 'react';
import { Lock, Fingerprint, X } from 'lucide-react';
import { authenticateWithBiometric, isBiometricAvailable } from '../utils/biometric';

interface ReauthPromptProps {
  onAuthenticate: (password: string) => Promise<boolean>;
  onCancel: () => void;
  message?: string;
}

export function ReauthPrompt({ onAuthenticate, onCancel, message }: ReauthPromptProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useState(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  });

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await onAuthenticate(password);
      if (!success) {
        setError('Incorrect password');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const success = await authenticateWithBiometric();
      if (success) {
        const storedPassword = sessionStorage.getItem('vault_master_password');
        if (storedPassword) {
          const authSuccess = await onAuthenticate(storedPassword);
          if (!authSuccess) {
            setError('Authentication failed');
          }
        } else {
          setError('Please authenticate with password first');
        }
      } else {
        setError('Biometric authentication failed');
      }
    } catch (err) {
      setError('Biometric authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Authentication Required</h3>
                <p className="text-slate-400 text-sm">{message || 'Verify your identity to continue'}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Master Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Enter your master password"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Authenticate'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-6 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {biometricAvailable && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">Or</span>
                </div>
              </div>

              <button
                onClick={handleBiometricAuth}
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-5 h-5" />
                Use Biometrics
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
