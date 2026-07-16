// Cache of the last known decision, since WKWebView (macOS Tauri's engine)
// doesn't support navigator.permissions.query({name:'microphone'}) — it
// throws — so without this, getMicPermissionState() always fell through to
// 'unknown' and the Settings row showed "Grant access" forever, even right
// after the user granted it.
const MIC_GRANTED_KEY = 'eyeread.micGranted.v1';

/**
 * Request microphone access.
 * - Checks current permission state first (no dialog if already granted).
 * - If denied, returns false immediately (OS Settings required to re-enable).
 * - If prompt state or Permissions API unavailable, triggers the native dialog.
 * - Releases the stream immediately after grant — we just need the permission.
 */
export async function requestMicPermission() {
  try {
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        if (status.state === 'granted') {
          localStorage.setItem(MIC_GRANTED_KEY, '1');
          return true;
        }
        if (status.state === 'denied') {
          localStorage.removeItem(MIC_GRANTED_KEY);
          return false;
        }
      } catch {
        // Permissions API query unsupported for 'microphone' on this
        // platform — fall through to the actual prompt below instead of
        // treating an unrelated query failure as a denial.
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    localStorage.setItem(MIC_GRANTED_KEY, '1');
    return true;
  } catch {
    localStorage.removeItem(MIC_GRANTED_KEY);
    return false;
  }
}

// Non-prompting read of the current permission state, for UI display.
// Returns 'granted' | 'denied' | 'prompt' | 'unknown'.
export async function getMicPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'microphone' });
      return status.state;
    }
  } catch {
    /* Permissions API unsupported for 'microphone' on this platform (WKWebView) */
  }
  // Fall back to the cached decision from a prior requestMicPermission()
  // call. If we've previously seen a grant, silently reconfirm it via
  // getUserMedia — once the OS has decided, that call resolves/rejects
  // immediately with no dialog, so this never surprises the user.
  if (localStorage.getItem(MIC_GRANTED_KEY) === '1') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      localStorage.removeItem(MIC_GRANTED_KEY);
      return 'denied';
    }
  }
  return 'unknown';
}

export const MIC_PRIVACY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
