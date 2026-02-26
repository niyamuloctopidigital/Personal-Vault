import { VaultData, createEmptyVault } from '../types/vault';
import { encryptData, decryptData, EncryptedData } from './crypto';
import { generateDeviceFingerprint } from './fingerprint';

const VAULT_FILE_EXTENSION = '.vault';
const VAULT_FILE_DESCRIPTION = 'Ironclad Vault File';

export interface VaultFileHandle {
  handle: FileSystemFileHandle;
  writable: FileSystemWritableFileStream | null;
}

export async function createNewVaultFile(): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `my-vault${VAULT_FILE_EXTENSION}`,
      types: [
        {
          description: VAULT_FILE_DESCRIPTION,
          accept: {
            'application/octet-stream': [VAULT_FILE_EXTENSION],
          },
        },
      ],
    });

    return handle;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

export async function openExistingVaultFile(): Promise<FileSystemFileHandle | null> {
  if (!('showOpenFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: VAULT_FILE_DESCRIPTION,
          accept: {
            'application/octet-stream': [VAULT_FILE_EXTENSION],
          },
        },
      ],
      multiple: false,
    });

    return handle;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

export async function saveVaultToFile(
  handle: FileSystemFileHandle,
  vaultData: VaultData,
  masterPassword: string,
  deviceId: string
): Promise<void> {
  const jsonData = JSON.stringify(vaultData, null, 2);

  const encrypted = await encryptData(jsonData, masterPassword, deviceId);

  const encryptedJson = JSON.stringify(encrypted);

  const writable = await handle.createWritable();
  await writable.write(encryptedJson);
  await writable.close();
}

export async function loadVaultFromFile(
  handle: FileSystemFileHandle,
  masterPassword: string,
  deviceId: string
): Promise<VaultData> {
  const file = await handle.getFile();
  const text = await file.text();

  if (!text || text.trim() === '') {
    return createEmptyVault();
  }

  try {
    const encrypted: EncryptedData = JSON.parse(text);

    let decrypted: string;
    let vaultData: VaultData;

    const fingerprint = await generateDeviceFingerprint();
    const OLD_ITERATIONS = 700000;
    const NEW_ITERATIONS = 1000000;

    const decryptionAttempts = [
      { id: deviceId, iterations: NEW_ITERATIONS, desc: 'new device ID with 1M iterations' },
      { id: deviceId, iterations: OLD_ITERATIONS, desc: 'new device ID with 700K iterations' },
      { id: fingerprint.hash, iterations: OLD_ITERATIONS, desc: 'old fingerprint with 700K iterations' },
      { id: fingerprint.hash, iterations: NEW_ITERATIONS, desc: 'old fingerprint with 1M iterations' },
    ];

    let lastError: Error | null = null;

    for (const attempt of decryptionAttempts) {
      try {
        decrypted = await decryptData(encrypted, masterPassword, attempt.id, attempt.iterations);
        vaultData = JSON.parse(decrypted);
        break;
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    if (!decrypted! || !vaultData!) {
      throw lastError || new Error('All decryption attempts failed');
    }

    if (!vaultData.trustedDeviceIds) {
      vaultData.trustedDeviceIds = [];
    }

    if (!vaultData.securitySettings.autoLockMinutes) {
      vaultData.securitySettings.autoLockMinutes = 15;
    }

    if (vaultData.securitySettings.requireReauthForView === undefined) {
      vaultData.securitySettings.requireReauthForView = true;
    }

    if (!vaultData.securitySettings.reauthIntervalMinutes) {
      vaultData.securitySettings.reauthIntervalMinutes = 30;
    }

    if (vaultData.biometricEnabled === undefined) {
      vaultData.biometricEnabled = false;
    }

    if (!vaultData.cards) {
      vaultData.cards = [];
    }

    if (vaultData.version !== '2.0.0') {
      vaultData.version = '2.0.0';
    }

    return vaultData;
  } catch (error) {
    throw new Error('Failed to decrypt vault: Invalid password or corrupted file');
  }
}

export async function verifyFileSystemAccess(): Promise<boolean> {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}
