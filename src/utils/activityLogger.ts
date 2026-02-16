import { ActivityLog, VaultData } from '../types/vault';

function getIPAddress(): string {
  return 'local';
}

export function logActivity(
  vault: VaultData,
  type: ActivityLog['type'],
  details: string,
  deviceId: string
): VaultData {
  const ipAddress = getIPAddress();

  const log: ActivityLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    details,
    deviceId,
    ipAddress,
  };

  return {
    ...vault,
    activityLog: [...vault.activityLog, log],
    updatedAt: Date.now(),
  };
}

export function getRecentLogs(vault: VaultData, limit: number = 50): ActivityLog[] {
  return [...vault.activityLog]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getLogsByType(vault: VaultData, type: ActivityLog['type']): ActivityLog[] {
  return vault.activityLog.filter(log => log.type === type);
}

export function getLogsByDevice(vault: VaultData, deviceId: string): ActivityLog[] {
  return vault.activityLog.filter(log => log.deviceId === deviceId);
}
