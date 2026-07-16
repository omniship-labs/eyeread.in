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
        if (status.state === 'granted') return true;
        if (status.state === 'denied') return false;
      } catch {
        // Permissions API query unsupported for 'microphone' on this
        // platform — fall through to the actual prompt below instead of
        // treating an unrelated query failure as a denial.
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
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
    /* Permissions API unsupported for 'microphone' on this platform */
  }
  return 'unknown';
}

export const MIC_PRIVACY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
