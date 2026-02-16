import { useState, useEffect, useCallback } from 'react';
import { LoginRegister } from './components/LoginRegister';
import { Auth } from './components/Auth';
import { PasswordManager } from './components/PasswordManager';
import { ActivityLogs } from './components/ActivityLogs';
import { DeviceManager } from './components/DeviceManager';
import { generateDeviceFingerprint } from './utils/fingerprint';
import { createEmptyVault } from './types/vault';
import type { VaultData, PasswordEntry, CardEntry, Folder } from './types/vault';
import {
  createNewVaultFile,
  openExistingVaultFile,
  saveVaultToFile,
  loadVaultFromFile,
  verifyFileSystemAccess,
} from './utils/vaultFile';
import {
  checkIfLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  unlockVault,
  canAccessVault,
  registerDevice,
} from './utils/security';
import { logActivity } from './utils/activityLogger';
import { secureWipe } from './utils/crypto';
import { authService, AuthUser } from './utils/authService';

type View = 'login' | 'vault-auth' | 'vault' | 'logs' | 'devices';

function App() {
  const [view, setView] = useState<View>('login');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supported = await verifyFileSystemAccess();
      setIsSupported(supported);

      const fingerprint = await generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint.hash);
    };

    init();

    return () => {
      if (masterPassword) {
        secureWipe({ masterPassword });
      }
    };
  }, []);

  const saveVault = useCallback(async (updatedVault: VaultData) => {
    if (!fileHandle || !masterPassword || !deviceFingerprint) return;

    try {
      await saveVaultToFile(fileHandle, updatedVault, masterPassword, deviceFingerprint);
      setVault(updatedVault);
    } catch (err: any) {
      setError(err.message || 'Failed to save vault');
    }
  }, [fileHandle, masterPassword, deviceFingerprint]);

  const handleCreateVault = async (password: string, deviceName: string) => {
    try {
      setError('');

      const handle = await createNewVaultFile();
      if (!handle) return;

      let newVault = createEmptyVault();

      newVault = registerDevice(newVault, deviceName, deviceFingerprint);

      newVault = logActivity(newVault, 'device_registered', `Device "${deviceName}" registered`, deviceFingerprint);

      await saveVaultToFile(handle, newVault, password, deviceFingerprint);

      setFileHandle(handle);
      setVault(newVault);
      setMasterPassword(password);
      setView('vault');
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    }
  };

  const handleOpenVault = async (password: string) => {
    try {
      setError('');

      let handle = fileHandle;
      if (!handle) {
        handle = await openExistingVaultFile();
        if (!handle) return;
        setFileHandle(handle);
      }

      const loadedVault = await loadVaultFromFile(handle, password, deviceFingerprint);

      const lockStatus = checkIfLocked(loadedVault);
      if (lockStatus.isLocked) {
        setVault(loadedVault);
        setError(`Vault is locked for ${lockStatus.remainingTime} more minutes`);
        return;
      }

      if (!canAccessVault(loadedVault, deviceFingerprint)) {
        setError('This device is not authorized. Maximum device limit reached.');
        return;
      }

      let updatedVault = loadedVault;

      if (loadedVault.deviceSlots.length > 0) {
        const hasDevice = loadedVault.deviceSlots.some(
          (slot) => slot.fingerprint === deviceFingerprint
        );

        if (!hasDevice) {
          const deviceName = `Device ${loadedVault.deviceSlots.length + 1}`;
          updatedVault = registerDevice(updatedVault, deviceName, deviceFingerprint);
          updatedVault = logActivity(
            updatedVault,
            'device_registered',
            `New device registered: ${deviceName}`,
            deviceFingerprint
          );
        } else {
          updatedVault = registerDevice(updatedVault, '', deviceFingerprint);
        }
      }

      updatedVault = resetFailedAttempts(updatedVault);

      updatedVault = logActivity(
        updatedVault,
        'login_success',
        'Successful vault unlock',
        deviceFingerprint
      );

      await saveVaultToFile(handle, updatedVault, password, deviceFingerprint);

      setVault(updatedVault);
      setMasterPassword(password);
      setView('vault');
    } catch (err: any) {
      let updatedVault = vault;

      if (updatedVault) {
        updatedVault = recordFailedAttempt(updatedVault);

        updatedVault = logActivity(
          updatedVault,
          'login_fail',
          'Failed login attempt',
          deviceFingerprint
        );

        const lockStatus = checkIfLocked(updatedVault);
        if (lockStatus.isLocked) {
          updatedVault = logActivity(
            updatedVault,
            'soft_lock',
            `Vault locked for ${lockStatus.remainingTime} minutes`,
            deviceFingerprint
          );
        }

        try {
          if (fileHandle && masterPassword) {
            await saveVaultToFile(fileHandle, updatedVault, masterPassword, deviceFingerprint);
          }
        } catch (saveErr) {
          console.error('Failed to save after failed attempt', saveErr);
        }

        setVault(updatedVault);
      }

      setError(err.message || 'Failed to unlock vault');
    }
  };

  const handleAddPassword = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>) => {
    if (!vault || !authUser) return;

    const newEntry: PasswordEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      viewCount: 0,
    };

    let updatedVault = {
      ...vault,
      passwords: [...vault.passwords, newEntry],
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleUpdatePassword = async (id: string, updates: Partial<PasswordEntry>) => {
    if (!vault || !authUser) return;

    let updatedVault = {
      ...vault,
      passwords: vault.passwords.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
      updatedAt: Date.now(),
    };

    const entry = updatedVault.passwords.find((p) => p.id === id);
    await saveVault(updatedVault);
  };

  const handleDeletePassword = async (id: string) => {
    if (!vault || !authUser) return;

    const entry = vault.passwords.find((p) => p.id === id);
    if (!entry) return;

    let updatedVault = {
      ...vault,
      passwords: vault.passwords.filter((p) => p.id !== id),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleViewPassword = async (id: string) => {
    if (!vault || !authUser) return;

    let updatedVault = {
      ...vault,
      passwords: vault.passwords.map((p) =>
        p.id === id ? { ...p, viewCount: p.viewCount + 1 } : p
      ),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleAddCard = async (entry: Omit<CardEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vault || !authUser) return;

    const newEntry: CardEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let updatedVault = {
      ...vault,
      cards: [...vault.cards, newEntry],
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleUpdateCard = async (id: string, updates: Partial<CardEntry>) => {
    if (!vault || !authUser) return;

    let updatedVault = {
      ...vault,
      cards: vault.cards.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleDeleteCard = async (id: string) => {
    if (!vault || !authUser) return;

    let updatedVault = {
      ...vault,
      cards: vault.cards.filter((c) => c.id !== id),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleAddFolder = async (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vault || !authUser) return;

    const newFolder: Folder = {
      ...folder,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let updatedVault = {
      ...vault,
      folders: [...vault.folders, newFolder],
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleUpdateFolder = async (id: string, updates: Partial<Folder>) => {
    if (!vault || !authUser) return;

    let updatedVault = {
      ...vault,
      folders: vault.folders.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
      ),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleDeleteFolder = async (id: string) => {
    if (!vault || !authUser) return;

    const folder = vault.folders.find((f) => f.id === id);
    if (!folder) return;

    let updatedVault = {
      ...vault,
      folders: vault.folders
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId ?? null) === id ? { ...f, parentId: folder.parentId ?? null } : f),
      passwords: vault.passwords.map((p) =>
        p.folderId === id ? { ...p, folderId: folder.parentId ?? null } : p
      ),
      updatedAt: Date.now(),
    };

    await saveVault(updatedVault);
  };

  const handleLogout = async () => {
    if (authUser) {
      await authService.logout(authUser.id, authUser.deviceId);
    }
    secureWipe({ masterPassword });
    setMasterPassword('');
    setVault(null);
    setAuthUser(null);
    setView('login');
    setError('');
  };

  const handleAuthenticated = (user: AuthUser) => {
    setAuthUser(user);
    setView('vault-auth');
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-red-500/20 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Browser Not Supported</h1>
          <p className="text-slate-300 mb-4">
            Your browser does not support the File System Access API, which is required for Ironclad Vault.
          </p>
          <p className="text-slate-400 text-sm">
            Please use a modern browser like Chrome, Edge, or Opera.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return <LoginRegister onAuthenticated={handleAuthenticated} />;
  }

  if (view === 'vault-auth') {
    const lockStatus = vault ? checkIfLocked(vault) : { isLocked: false, remainingTime: 0 };

    return (
      <Auth
        onCreateVault={handleCreateVault}
        onOpenVault={handleOpenVault}
        isLocked={lockStatus.isLocked}
        lockTimeRemaining={lockStatus.remainingTime}
        error={error}
      />
    );
  }

  if (view === 'logs' && vault && authUser) {
    return <ActivityLogs userId={authUser.id} localLogs={vault.activityLog} onBack={() => setView('vault')} />;
  }

  if (view === 'devices' && vault && authUser) {
    return (
      <DeviceManager
        userId={authUser.id}
        currentDeviceId={authUser.deviceId}
        onBack={() => setView('vault')}
      />
    );
  }

  if (view === 'vault' && vault && authUser) {
    return (
      <PasswordManager
        passwords={vault.passwords}
        cards={vault.cards}
        folders={vault.folders}
        userId={authUser.id}
        onAddPassword={handleAddPassword}
        onUpdatePassword={handleUpdatePassword}
        onDeletePassword={handleDeletePassword}
        onViewPassword={handleViewPassword}
        onAddCard={handleAddCard}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onAddFolder={handleAddFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        onLogout={handleLogout}
        onShowLogs={() => setView('logs')}
        onShowDevices={() => setView('devices')}
      />
    );
  }

  return null;
}

export default App;
