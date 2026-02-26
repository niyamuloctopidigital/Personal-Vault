export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PasswordEntry {
  id: string;
  folderId: string | null;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
}

export interface CardEntry {
  id: string;
  folderId: string | null;
  cardName: string;
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType: 'credit' | 'debit' | 'prepaid';
  company: string;
  billingAddress?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'login_success' | 'login_fail' | 'password_view' | 'password_create' | 'password_update' | 'password_delete' | 'device_registered' | 'soft_lock' | 'folder_create' | 'folder_update' | 'folder_delete' | 'card_view' | 'card_create' | 'card_update' | 'card_delete';
  details: string;
  deviceId: string;
  ipAddress: string;
}

export interface DeviceSlot {
  id: string;
  name: string;
  fingerprint: string;
  registeredAt: number;
  lastAccess: number;
}

export interface VaultData {
  version: string;
  createdAt: number;
  updatedAt: number;
  deviceSlots: DeviceSlot[];
  folders: Folder[];
  passwords: PasswordEntry[];
  cards: CardEntry[];
  activityLog: ActivityLog[];
  securitySettings: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    lastFailedAttempt: number;
    failedAttemptCount: number;
    isLocked: boolean;
    lockUntil: number;
  };
}

export function createEmptyVault(): VaultData {
  return {
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceSlots: [],
    folders: [],
    passwords: [],
    cards: [],
    activityLog: [],
    securitySettings: {
      maxFailedAttempts: 3,
      lockoutDurationMinutes: 30,
      lastFailedAttempt: 0,
      failedAttemptCount: 0,
      isLocked: false,
      lockUntil: 0,
    },
  };
}
