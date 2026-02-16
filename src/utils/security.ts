import { VaultData } from '../types/vault';

export function checkIfLocked(vault: VaultData): { isLocked: boolean; remainingTime: number } {
  const now = Date.now();

  if (vault.securitySettings.isLocked && vault.securitySettings.lockUntil > now) {
    const remainingMs = vault.securitySettings.lockUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);
    return { isLocked: true, remainingTime: remainingMinutes };
  }

  if (vault.securitySettings.isLocked && vault.securitySettings.lockUntil <= now) {
    return { isLocked: false, remainingTime: 0 };
  }

  return { isLocked: false, remainingTime: 0 };
}

export function recordFailedAttempt(vault: VaultData): VaultData {
  const now = Date.now();
  const updatedCount = vault.securitySettings.failedAttemptCount + 1;

  const shouldLock = updatedCount >= vault.securitySettings.maxFailedAttempts;

  const lockDurationMs = vault.securitySettings.lockoutDurationMinutes * 60 * 1000;

  return {
    ...vault,
    securitySettings: {
      ...vault.securitySettings,
      lastFailedAttempt: now,
      failedAttemptCount: updatedCount,
      isLocked: shouldLock,
      lockUntil: shouldLock ? now + lockDurationMs : vault.securitySettings.lockUntil,
    },
    updatedAt: now,
  };
}

export function resetFailedAttempts(vault: VaultData): VaultData {
  return {
    ...vault,
    securitySettings: {
      ...vault.securitySettings,
      failedAttemptCount: 0,
      lastFailedAttempt: 0,
      isLocked: false,
      lockUntil: 0,
    },
    updatedAt: Date.now(),
  };
}

export function unlockVault(vault: VaultData): VaultData {
  return {
    ...vault,
    securitySettings: {
      ...vault.securitySettings,
      isLocked: false,
      lockUntil: 0,
      failedAttemptCount: 0,
    },
    updatedAt: Date.now(),
  };
}

export function canAccessVault(vault: VaultData, deviceFingerprint: string): boolean {
  if (vault.deviceSlots.length === 0) {
    return true;
  }

  const MAX_DEVICE_SLOTS = 2;
  const hasMatchingSlot = vault.deviceSlots.some(
    slot => slot.fingerprint === deviceFingerprint
  );

  if (hasMatchingSlot) {
    return true;
  }

  return vault.deviceSlots.length < MAX_DEVICE_SLOTS;
}

export function registerDevice(
  vault: VaultData,
  deviceName: string,
  deviceFingerprint: string
): VaultData {
  const existingSlot = vault.deviceSlots.find(
    slot => slot.fingerprint === deviceFingerprint
  );

  if (existingSlot) {
    return {
      ...vault,
      deviceSlots: vault.deviceSlots.map(slot =>
        slot.fingerprint === deviceFingerprint
          ? { ...slot, lastAccess: Date.now() }
          : slot
      ),
      updatedAt: Date.now(),
    };
  }

  const MAX_DEVICE_SLOTS = 2;
  if (vault.deviceSlots.length >= MAX_DEVICE_SLOTS) {
    throw new Error(`Maximum device limit reached (${MAX_DEVICE_SLOTS} devices)`);
  }

  const newSlot = {
    id: crypto.randomUUID(),
    name: deviceName,
    fingerprint: deviceFingerprint,
    registeredAt: Date.now(),
    lastAccess: Date.now(),
  };

  return {
    ...vault,
    deviceSlots: [...vault.deviceSlots, newSlot],
    updatedAt: Date.now(),
  };
}
