const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Speech recognition has no Permissions API query — the only way to learn
// its status is to actually start a session and see whether it fires
// onstart (granted) or onerror('not-allowed' | 'service-not-allowed')
// (denied). Stops immediately either way; we only need the outcome.
export async function requestSpeechRecognitionPermission() {
  if (!SR) return false;
  return new Promise((resolve) => {
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    let settled = false;
    const finish = (granted) => {
      if (settled) return;
      settled = true;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      resolve(granted);
    };
    rec.onstart = () => finish(true);
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') finish(false);
    };
    rec.onend = () => finish(false);
    try {
      rec.start();
    } catch {
      finish(false);
    }
  });
}

export const SPEECH_PRIVACY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition';
