import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Eye, Plus, Edit, Trash2, HardDrive, Lock, Folder, User, RefreshCw, Trash } from 'lucide-react';
import { ActivityLog } from '../types/vault';
import { authService } from '../utils/authService';

interface ActivityLogsProps {
  userId: string;
  localLogs?: ActivityLog[];
  onBack: () => void;
}

const iconMap: Record<string, any> = {
  login_success: CheckCircle,
  login_fail: XCircle,
  password_view: Eye,
  password_create: Plus,
  password_update: Edit,
  password_delete: Trash2,
  password_created: Plus,
  password_updated: Edit,
  password_deleted: Trash2,
  password_copied: Eye,
  device_registered: HardDrive,
  device_authorized: HardDrive,
  device_revoked: XCircle,
  soft_lock: Lock,
  folder_create: Folder,
  folder_update: Folder,
  folder_delete: Folder,
  folder_created: Folder,
  folder_updated: Folder,
  folder_deleted: Folder,
  user_registered: User,
  new_device_detected: HardDrive,
  logout: Lock,
};

const colorMap: Record<string, string> = {
  login_success: 'text-green-600',
  login_fail: 'text-red-600',
  password_view: 'text-blue-600',
  password_create: 'text-emerald-600',
  password_update: 'text-amber-600',
  password_delete: 'text-red-600',
  password_created: 'text-emerald-600',
  password_updated: 'text-amber-600',
  password_deleted: 'text-red-600',
  password_copied: 'text-blue-600',
  device_registered: 'text-purple-600',
  device_authorized: 'text-green-600',
  device_revoked: 'text-red-600',
  soft_lock: 'text-orange-600',
  folder_create: 'text-cyan-600',
  folder_update: 'text-blue-600',
  folder_delete: 'text-rose-600',
  folder_created: 'text-cyan-600',
  folder_updated: 'text-blue-600',
  folder_deleted: 'text-rose-600',
  user_registered: 'text-green-600',
  new_device_detected: 'text-amber-600',
  logout: 'text-gray-600',
};

export function ActivityLogs({ userId, localLogs = [], onBack }: ActivityLogsProps) {
  const [cloudLogs, setCloudLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    try {
      const logs = await authService.getActivityLogs(userId, 100);
      setCloudLogs(logs);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const logs = await authService.getActivityLogs(userId, 100);
      setCloudLogs(logs);
    } catch (error) {
      console.error('Failed to refresh activity logs:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const success = await authService.clearActivityLogs(userId);
      if (success) {
        setCloudLogs([]);
      }
    } catch (error) {
      console.error('Failed to clear activity logs:', error);
    } finally {
      setClearing(false);
    }
  };

  const securityEventTypes = ['login_success', 'login_fail', 'login_failed', 'device_registered', 'device_authorized', 'device_revoked', 'soft_lock', 'new_device_detected', 'logout', 'user_registered'];

  const allLogs = [
    ...cloudLogs.map(log => ({
      id: log.id,
      type: log.action_type,
      details: formatLogDetails(log.action_type, log.details),
      timestamp: new Date(log.created_at).getTime(),
      deviceId: log.devices?.device_fingerprint || 'unknown',
      deviceName: log.devices?.device_name || 'Unknown Device',
      ipAddress: log.ip_address || 'N/A',
    })),
    ...localLogs.map(log => ({
      ...log,
      deviceName: 'Local',
    }))
  ]
  .filter(log => securityEventTypes.includes(log.type))
  .sort((a, b) => b.timestamp - a.timestamp);

  function formatLogDetails(actionType: string, details: any): string {
    switch (actionType) {
      case 'user_registered':
        return `Account created: ${details.email}`;
      case 'login_success':
        return `Successful login: ${details.email}`;
      case 'login_failed':
        return `Failed login attempt: ${details.reason || 'Invalid credentials'}`;
      case 'password_created':
        return `Password created: ${details.title}`;
      case 'password_updated':
        return `Password updated: ${details.title}`;
      case 'password_deleted':
        return `Password deleted: ${details.title}`;
      case 'password_copied':
        return `Password copied: ${details.title} (${details.access_count} times)`;
      case 'folder_created':
        return `Folder created: ${details.folder_name}`;
      case 'folder_updated':
        return `Folder updated: ${details.folder_name}`;
      case 'folder_deleted':
        return `Folder deleted: ${details.folder_name}`;
      case 'device_authorized':
        return `Device authorized`;
      case 'device_revoked':
        return `Device access revoked`;
      case 'new_device_detected':
        return `New device detected: ${details.device_name}`;
      case 'logout':
        return `User logged out`;
      default:
        return actionType.replace(/_/g, ' ');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Security Events</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : `${allLogs.length} events`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-lg transition-all border border-gray-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearLogs}
              disabled={clearing || loading || allLogs.length === 0}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-200"
            >
              <Trash className={`w-4 h-4 ${clearing ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : allLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allLogs.map((log) => {
                const Icon = iconMap[log.type] || HardDrive;
                const color = colorMap[log.type] || 'text-gray-600';

                return (
                  <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{log.details}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleString()} • {log.deviceName || log.deviceId.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
