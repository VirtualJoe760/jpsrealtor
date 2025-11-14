// src/app/utils/fingerprint.ts
// Generate a persistent browser fingerprint for anonymous user identification

export async function generateBrowserFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    return "server-side-render";
  }

  // Collect browser characteristics
  const components: string[] = [];

  // Screen resolution
  components.push(`screen:${window.screen.width}x${window.screen.height}`);

  // Timezone
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // Language
  components.push(`lang:${navigator.language}`);

  // Platform
  components.push(`platform:${navigator.platform}`);

  // User agent
  components.push(`ua:${navigator.userAgent}`);

  // Color depth
  components.push(`color:${window.screen.colorDepth}`);

  // Hardware concurrency (CPU cores)
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);

  // Device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory) {
    components.push(`memory:${memory}`);
  }

  // Canvas fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Browser Fingerprint', 4, 17);

      const canvasData = canvas.toDataURL();
      components.push(`canvas:${simpleHash(canvasData)}`);
    }
  } catch (e) {
    // Canvas fingerprinting might be blocked
    components.push('canvas:blocked');
  }

  // WebGL fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`webgl:${vendor}|${renderer}`);
      }
    }
  } catch (e) {
    components.push('webgl:unavailable');
  }

  // Join all components and hash
  const fingerprintString = components.join('||');
  const fingerprint = await simpleHash(fingerprintString);

  return fingerprint;
}

// Simple hash function for fingerprinting
async function simpleHash(str: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Fallback to simple hash for older browsers
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `legacy-${Math.abs(hash).toString(36)}`;
  }

  // Use SubtleCrypto API for better hashing
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32); // Return first 32 characters
  } catch (e) {
    // Fallback if SubtleCrypto fails
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback-${Math.abs(hash).toString(36)}`;
  }
}

// Get or create fingerprint (cached in sessionStorage)
export async function getOrCreateFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    return "server-side";
  }

  // Check if we already have a fingerprint in sessionStorage
  const cached = sessionStorage.getItem('browserFingerprint');
  if (cached) {
    return cached;
  }

  // Generate new fingerprint
  const fingerprint = await generateBrowserFingerprint();

  // Cache it
  sessionStorage.setItem('browserFingerprint', fingerprint);

  return fingerprint;
}
