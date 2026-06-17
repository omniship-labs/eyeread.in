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
      const status = await navigator.permissions.query({ name: 'microphone' });
      if (status.state === 'granted') return true;
      if (status.state === 'denied') return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
