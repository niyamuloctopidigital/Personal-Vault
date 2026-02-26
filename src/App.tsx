import { useState, useEffect, useCallback, useRef } from 'react';
import { SimpleAuth } from './components/SimpleAuth';
import { PasswordManager } from './components/PasswordManager';
import { ActivityLogs } from './components/ActivityLogs';
import { ReauthPrompt } from './components/ReauthPrompt';
import { getOrCreateDeviceId, getDeviceName } from './utils/deviceId';
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
} from './utils/security';
import { logActivity } from './utils/activityLogger';
import { secureWipe } from './utils/crypto';
import { AutoLockManager } from './utils/autoLock';
import { isTrustedDevice } from './utils/deviceId';

type View = 'auth' | 'vault' | 'logs';

function App() {
  const [view, setView] = useState<View>('auth');
  const [vault, setVault] = useState<VaultData | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [showReauth, setShowReauth] = useState(false);
  const [reauthCallback, setReauthCallback] = useState<(() => void) | null>(null);
  const [lastReauth, setLastReauth] = useState(Date.now());
  const autoLockManager = useRef<AutoLockManager | null>(null);

  useEffect(() => {
    const init = async () => {
      const supported = await verifyFileSystemAccess();
      setIsSupported(supported);

      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    };

    init();

    return () => {
      if (masterPassword) {
        secureWipe({ masterPassword });
      }
      if (autoLockManager.current) {
        autoLockManager.current.destroy();
      }
    };
  }, []);

  const handleAutoLock = useCallback(() => {
    secureWipe({ masterPassword });
    setMasterPassword('');
    setVault(null);
    setView('auth');
    sessionStorage.removeItem('vault_master_password');
  }, [masterPassword]);

  const saveVault = useCallback(async (updatedVault: VaultData) => {
    if (!fileHandle || !masterPassword || !deviceId) return;

    try {
      await saveVaultToFile(fileHandle, updatedVault, masterPassword, deviceId);
      setVault(updatedVault);
    } catch (err: any) {
      setError(err.message || 'Failed to save vault');
    }
  }, [fileHandle, masterPassword, deviceId]);

  const requireReauth = useCallback((callback: () => void) => {
    const now = Date.now();
    const reauthInterval = (vault?.securitySettings.reauthIntervalMinutes || 30) * 60 * 1000;

    if (vault?.securitySettings.requireReauthForView && now - lastReauth > reauthInterval) {
      setReauthCallback(() => callback);
      setShowReauth(true);
    } else {
      callback();
    }
  }, [vault, lastReauth]);

  const handleReauthSuccess = useCallback(async (password: string): Promise<boolean> => {
    if (password === masterPassword) {
      setLastReauth(Date.now());
      setShowReauth(false);
      if (reauthCallback) {
        reauthCallback();
        setReauthCallback(null);
      }
      return true;
    }
    return false;
  }, [masterPassword, reauthCallback]);

  const handleUnlock = async (password: string, createNew: boolean) => {
    try {
      setError('');

      if (createNew) {
        const handle = await createNewVaultFile();
        if (!handle) return;

        let newVault = createEmptyVault();

        const deviceName = await getDeviceName();
        newVault.trustedDeviceIds = [deviceId];

        newVault = logActivity(newVault, 'device_registered', `Device "${deviceName}" registered`, deviceId);

        await saveVaultToFile(handle, newVault, password, deviceId);

        setFileHandle(handle);
        setVault(newVault);
        setMasterPassword(password);
        setView('vault');

        if (!autoLockManager.current) {
          autoLockManager.current = new AutoLockManager(newVault.securitySettings.autoLockMinutes);
        }
        autoLockManager.current.start(handleAutoLock);
      } else {
        let handle = fileHandle;
        if (!handle) {
          handle = await openExistingVaultFile();
          if (!handle) return;
          setFileHandle(handle);
        }

        const loadedVault = await loadVaultFromFile(handle, password, deviceId);

        const lockStatus = checkIfLocked(loadedVault);
        if (lockStatus.isLocked) {
          setVault(loadedVault);
          throw new Error(`Vault is locked for ${lockStatus.remainingTime} more minutes`);
        }

        const isTrusted = await isTrustedDevice(loadedVault.trustedDeviceIds);

        let updatedVault = loadedVault;

        if (!isTrusted) {
          updatedVault.trustedDeviceIds.push(deviceId);
          const deviceName = await getDeviceName();
          updatedVault = logActivity(
            updatedVault,
            'device_registered',
            `New device registered: ${deviceName}`,
            deviceId
          );
        }

        updatedVault = resetFailedAttempts(updatedVault);

        updatedVault = logActivity(
          updatedVault,
          'login_success',
          'Successful vault unlock',
          deviceId
        );

        await saveVaultToFile(handle, updatedVault, password, deviceId);

        setVault(updatedVault);
        setMasterPassword(password);
        setView('vault');
        setLastReauth(Date.now());

        if (!autoLockManager.current) {
          autoLockManager.current = new AutoLockManager(updatedVault.securitySettings.autoLockMinutes);
        }
        autoLockManager.current.start(handleAutoLock);
      }
    } catch (err: any) {
      let updatedVault = vault;

      if (updatedVault && !createNew) {
        updatedVault = recordFailedAttempt(updatedVault);

        updatedVault = logActivity(
          updatedVault,
          'login_fail',
          'Failed login attempt',
          deviceId
        );

        const lockStatus = checkIfLocked(updatedVault);
        if (lockStatus.isLocked) {
          updatedVault = logActivity(
            updatedVault,
            'soft_lock',
            `Vault locked for ${lockStatus.remainingTime} minutes`,
            deviceId
          );
        }

        try {
          if (fileHandle && masterPassword) {
            await saveVaultToFile(fileHandle, updatedVault, masterPassword, deviceId);
          }
        } catch (saveErr) {
          console.error('Failed to save after failed attempt', saveErr);
        }

        setVault(updatedVault);
      }

      throw err;
    }
  };

  const handleAddPassword = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>) => {
    if (!vault) return;

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

    updatedVault = logActivity(updatedVault, 'password_create', `Password created: ${entry.title}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleUpdatePassword = async (id: string, updates: Partial<PasswordEntry>) => {
    if (!vault) return;

    let updatedVault = {
      ...vault,
      passwords: vault.passwords.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
      updatedAt: Date.now(),
    };

    const entry = updatedVault.passwords.find((p) => p.id === id);
    if (entry) {
      updatedVault = logActivity(updatedVault, 'password_update', `Password updated: ${entry.title}`, deviceId);
    }

    await saveVault(updatedVault);
  };

  const handleDeletePassword = async (id: string) => {
    if (!vault) return;

    const entry = vault.passwords.find((p) => p.id === id);
    if (!entry) return;

    let updatedVault = {
      ...vault,
      passwords: vault.passwords.filter((p) => p.id !== id),
      updatedAt: Date.now(),
    };

    updatedVault = logActivity(updatedVault, 'password_delete', `Password deleted: ${entry.title}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleViewPassword = async (id: string) => {
    if (!vault) return;

    requireReauth(async () => {
      let updatedVault = {
        ...vault,
        passwords: vault.passwords.map((p) =>
          p.id === id ? { ...p, viewCount: p.viewCount + 1 } : p
        ),
        updatedAt: Date.now(),
      };

      const entry = updatedVault.passwords.find((p) => p.id === id);
      if (entry) {
        updatedVault = logActivity(updatedVault, 'password_view', `Password viewed: ${entry.title}`, deviceId);
      }

      await saveVault(updatedVault);
    });
  };

  const handleAddCard = async (entry: Omit<CardEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vault) return;

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

    updatedVault = logActivity(updatedVault, 'card_create', `Card created: ${entry.cardName}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleUpdateCard = async (id: string, updates: Partial<CardEntry>) => {
    if (!vault) return;

    let updatedVault = {
      ...vault,
      cards: vault.cards.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
      updatedAt: Date.now(),
    };

    const card = updatedVault.cards.find((c) => c.id === id);
    if (card) {
      updatedVault = logActivity(updatedVault, 'card_update', `Card updated: ${card.cardName}`, deviceId);
    }

    await saveVault(updatedVault);
  };

  const handleDeleteCard = async (id: string) => {
    if (!vault) return;

    const card = vault.cards.find((c) => c.id === id);
    if (!card) return;

    let updatedVault = {
      ...vault,
      cards: vault.cards.filter((c) => c.id !== id),
      updatedAt: Date.now(),
    };

    updatedVault = logActivity(updatedVault, 'card_delete', `Card deleted: ${card.cardName}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleAddFolder = async (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vault) return;

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

    updatedVault = logActivity(updatedVault, 'folder_create', `Folder created: ${folder.name}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleUpdateFolder = async (id: string, updates: Partial<Folder>) => {
    if (!vault) return;

    let updatedVault = {
      ...vault,
      folders: vault.folders.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
      ),
      updatedAt: Date.now(),
    };

    const folder = updatedVault.folders.find((f) => f.id === id);
    if (folder) {
      updatedVault = logActivity(updatedVault, 'folder_update', `Folder updated: ${folder.name}`, deviceId);
    }

    await saveVault(updatedVault);
  };

  const handleDeleteFolder = async (id: string) => {
    if (!vault) return;

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
      cards: vault.cards.map((c) =>
        c.folderId === id ? { ...c, folderId: folder.parentId ?? null } : c
      ),
      updatedAt: Date.now(),
    };

    updatedVault = logActivity(updatedVault, 'folder_delete', `Folder deleted: ${folder.name}`, deviceId);

    await saveVault(updatedVault);
  };

  const handleLogout = async () => {
    if (autoLockManager.current) {
      autoLockManager.current.destroy();
      autoLockManager.current = null;
    }

    secureWipe({ masterPassword });
    setMasterPassword('');
    setVault(null);
    setView('auth');
    setError('');
    sessionStorage.removeItem('vault_master_password');
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

  if (view === 'auth') {
    const lockStatus = vault ? checkIfLocked(vault) : { isLocked: false, remainingTime: 0, lockUntil: 0 };

    return (
      <SimpleAuth
        onUnlock={handleUnlock}
        lockStatus={{ isLocked: lockStatus.isLocked, lockUntil: lockStatus.isLocked ? Date.now() + (lockStatus.remainingTime * 60000) : 0 }}
      />
    );
  }

  if (view === 'logs' && vault) {
    return (
      <ActivityLogs
        userId={deviceId}
        localLogs={vault.activityLog}
        onBack={() => setView('vault')}
      />
    );
  }

  if (view === 'vault' && vault) {
    return (
      <>
        <PasswordManager
          passwords={vault.passwords}
          cards={vault.cards}
          folders={vault.folders}
          userId={deviceId}
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
          onShowDevices={() => setView('logs')}
        />

        {showReauth && (
          <ReauthPrompt
            onAuthenticate={handleReauthSuccess}
            onCancel={() => {
              setShowReauth(false);
              setReauthCallback(null);
            }}
            message="Re-authentication required to view sensitive data"
          />
        )}
      </>
    );
  }

  return null;
}

export default App;
