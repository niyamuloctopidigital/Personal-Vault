export async function getOrCreateDeviceId(): Promise<string> {
  const DEVICE_ID_KEY = 'vault_device_id';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    deviceId = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function getDeviceInfo(): Promise<string> {
  const deviceId = await getOrCreateDeviceId();

  const info = {
    deviceId,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
  };

  return JSON.stringify(info);
}

export async function isTrustedDevice(storedDeviceIds: string[]): Promise<boolean> {
  const currentDeviceId = await getOrCreateDeviceId();
  return storedDeviceIds.includes(currentDeviceId);
}

export async function getDeviceName(): Promise<string> {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
  const platform = navigator.platform;

  if (isTablet) return `Tablet (${platform})`;
  if (isMobile) return `Mobile (${platform})`;
  return `Desktop (${platform})`;
}
