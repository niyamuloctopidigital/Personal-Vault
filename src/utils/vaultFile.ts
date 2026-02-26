import { VaultData, createEmptyVault } from '../types/vault';
import { encryptData, decryptData, EncryptedData } from './crypto';

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
  hardwareFingerprint: string
): Promise<void> {
  const jsonData = JSON.stringify(vaultData, null, 2);

  const encrypted = await encryptData(jsonData, masterPassword, '');

  const encryptedJson = JSON.stringify(encrypted);

  const writable = await handle.createWritable();
  await writable.write(encryptedJson);
  await writable.close();
}

export async function loadVaultFromFile(
  handle: FileSystemFileHandle,
  masterPassword: string,
  hardwareFingerprint: string
): Promise<VaultData> {
  const file = await handle.getFile();
  const text = await file.text();

  if (!text || text.trim() === '') {
    return createEmptyVault();
  }

  try {
    const encrypted: EncryptedData = JSON.parse(text);

    const decrypted = await decryptData(encrypted, masterPassword, '');

    const vaultData: VaultData = JSON.parse(decrypted);

    if (!vaultData.cards) {
      vaultData.cards = [];
    }

    return vaultData;
  } catch (error) {
    throw new Error('Failed to decrypt vault: Invalid password or corrupted file');
  }
}

export async function verifyFileSystemAccess(): Promise<boolean> {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}
