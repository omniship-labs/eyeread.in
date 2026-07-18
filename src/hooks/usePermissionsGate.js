import { useCallback, useState, createElement } from 'react';
import {
  requestMicPermission,
  getMicPermissionState,
  MIC_PRIVACY_SETTINGS_URL,
} from '../lib/mic';
import {
  requestSpeechRecognitionPermission,
  getSpeechPermissionState,
  SPEECH_PRIVACY_SETTINGS_URL,
  DICTATION_SETTINGS_URL,
} from '../lib/speech';
import { isMacOS, openExternal } from '../lib/tauri';
import { voiceAvailable } from './useVoiceTracking';
import { PermissionsModal } from '../components/PermissionsModal';

/**
 * usePermissionsGate — single source of truth for the voice-tracking
 * permissions modal (mic + speech-recognition access, plus a Dictation
 * pointer on macOS). Two entry points:
 *
 *   requestGate(voiceEnabled, run) — call before starting a reading session.
 *     Calls `run()` immediately when voice mode is off or the Web Speech
 *     API isn't available at all — nothing to grant either way. Otherwise
 *     checks live permission state and only opens the modal if something
 *     isn't confirmed granted; `run()` then fires once the user continues.
 *     Cancelling never calls `run()`.
 *
 *   openManually() — e.g. a "Check permissions" row in Settings; opens the
 *     modal on demand regardless of current state.
 *
 * Continue is never blocked on actually granting anything — this is a head
 * start, not a hard gate. The overlay's own retry chips (mic-denied gesture
 * healer, mic-issue Dictation link) keep handling recovery for whichever
 * session ends up live, same as before this modal existed.
 *
 * @returns { requestGate, openManually, modal }
 *   modal — JSX to render somewhere in the tree (null when closed)
 */
export function usePermissionsGate() {
  const [open, setOpen] = useState(false);
  const [micState, setMicState] = useState('unknown');
  const [speechState, setSpeechState] = useState('unknown');
  // The action to run once the user continues past the modal. Held in state
  // (via the functional-update form, so React stores the function itself
  // rather than calling it as an updater) instead of a ref — a ref read
  // from a callback handed to the modal as a prop trips the "no ref access
  // during render" lint rule, since it can't prove the modal won't invoke
  // it synchronously.
  const [onProceed, setOnProceed] = useState(null);

  const finish = useCallback(
    (proceed) => {
      setOpen(false);
      if (proceed) onProceed?.();
      setOnProceed(null);
    },
    [onProceed]
  );

  const requestGate = useCallback((voiceEnabled, run) => {
    if (!voiceEnabled || !voiceAvailable) {
      run();
      return;
    }
    Promise.all([getMicPermissionState(), Promise.resolve(getSpeechPermissionState())]).then(
      ([mic, speech]) => {
        setMicState(mic);
        setSpeechState(speech);
        if (mic === 'granted' && speech === 'granted') {
          run();
          return;
        }
        setOnProceed(() => run);
        setOpen(true);
      }
    );
  }, []);

  const openManually = useCallback(() => {
    getMicPermissionState().then(setMicState);
    setSpeechState(getSpeechPermissionState());
    setOpen(true);
  }, []);

  const onGrantMic = useCallback(async () => {
    setMicState((await requestMicPermission()) ? 'granted' : 'denied');
  }, []);

  const onGrantSpeech = useCallback(async () => {
    setSpeechState((await requestSpeechRecognitionPermission()) ? 'granted' : 'denied');
  }, []);

  const modal = open
    ? createElement(PermissionsModal, {
        micState,
        speechState,
        onGrantMic,
        onGrantSpeech,
        onOpenMicSettings: () => isMacOS && openExternal(MIC_PRIVACY_SETTINGS_URL),
        onOpenSpeechSettings: () => isMacOS && openExternal(SPEECH_PRIVACY_SETTINGS_URL),
        onOpenDictationSettings: () => isMacOS && openExternal(DICTATION_SETTINGS_URL),
        onContinue: () => finish(true),
        onCancel: () => finish(false),
      })
    : null;

  return { requestGate, openManually, modal };
}
