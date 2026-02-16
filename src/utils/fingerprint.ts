export interface DeviceFingerprint {
  hash: string;
  components: {
    canvas: string;
    webgl: string;
    hardware: string;
    screen: string;
    platform: string;
    misc: string;
  };
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas-unavailable';

    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Ironclad Vault 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Ironclad Vault 🔒', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl-unavailable';

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'webgl-no-debug';

    const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor}|${renderer}`;
  } catch {
    return 'webgl-error';
  }
}

function getHardwareFingerprint(): string {
  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as any).deviceMemory || 0;
  return `cores:${cores}|mem:${memory}`;
}

function getScreenFingerprint(): string {
  const { width, height, colorDepth, pixelDepth } = window.screen;
  const ratio = window.devicePixelRatio || 1;
  return `${width}x${height}|depth:${colorDepth}:${pixelDepth}|ratio:${ratio}`;
}

function getPlatformFingerprint(): string {
  const { platform, language, languages } = navigator;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${platform}|${language}|${(languages as string[]).join(',')}|${timezone}`;
}

function getMiscFingerprint(): string {
  const plugins = Array.from(navigator.plugins || [])
    .map(p => p.name)
    .sort()
    .join(',');
  const cookieEnabled = navigator.cookieEnabled;
  const doNotTrack = navigator.doNotTrack || 'unspecified';
  return `plugins:${plugins}|cookie:${cookieEnabled}|dnt:${doNotTrack}`;
}

export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const components = {
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    hardware: getHardwareFingerprint(),
    screen: getScreenFingerprint(),
    platform: getPlatformFingerprint(),
    misc: getMiscFingerprint(),
  };

  const combined = Object.values(components).join('::');
  const hash = await sha256(combined);

  return { hash, components };
}

export async function verifyDeviceFingerprint(storedHash: string): Promise<boolean> {
  const current = await generateDeviceFingerprint();
  return current.hash === storedHash;
}
