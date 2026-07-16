const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Cache of the last known decision — speech recognition has no Permissions
// API query at all, so without this the Settings row always showed "Grant
// access", never "Granted", even right after the user granted it.
const SPEECH_GRANTED_KEY = 'eyeread.speechGranted.v1';

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
      if (granted) localStorage.setItem(SPEECH_GRANTED_KEY, '1');
      else localStorage.removeItem(SPEECH_GRANTED_KEY);
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

// Non-prompting read of the last known state, for UI display on mount.
// Returns 'granted' | 'unknown' — there's no live, silent way to confirm a
// prior grant still holds (unlike mic, a probe here would itself prompt),
// so this only ever reflects what a previous requestSpeechRecognitionPermission()
// call observed.
export function getSpeechPermissionState() {
  return localStorage.getItem(SPEECH_GRANTED_KEY) === '1' ? 'granted' : 'unknown';
}

export const SPEECH_PRIVACY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition';
