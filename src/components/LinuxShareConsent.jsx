import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import './linux-consent.css';

/**
 * LinuxShareConsent — risk-acknowledgement modal shown before enabling
 * "Hide from screen-share" on Linux.
 *
 * Unlike macOS (NSWindowSharingType) and Windows (WDA_EXCLUDEFROMCAPTURE),
 * Linux has no portable compositor-level capture exclusion. Whether the
 * overlay is actually hidden depends entirely on the user's compositor, so we
 * make the user explicitly accept that it may NOT work before turning it on.
 *
 * Props:
 *   onAccept — () => void  user accepts the risk; caller enables protection
 *   onCancel — () => void  user backs out; protection stays off
 */
export function LinuxShareConsent({ onAccept, onCancel }) {
  // Esc cancels, like every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="lsc-backdrop" onClick={onCancel} role="presentation">
      <div
        className="lsc-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lsc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lsc-head">
          <span className="lsc-icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <span className="lsc-title" id="lsc-title">
            Screen-share hiding is experimental on Linux
          </span>
        </div>

        <div className="lsc-body">
          <p>
            On macOS and Windows the operating system guarantees this window is excluded from
            screen capture. <b>Linux has no such guarantee.</b>
          </p>
          <ul className="lsc-list">
            <li>
              Whether the overlay is hidden depends entirely on your compositor (KWin, Mutter,
              wlroots, X11…). On most setups it will <b>not</b> be hidden.
            </li>
            <li>
              Your script may be fully visible to anyone you are sharing with, or appear in
              recordings.
            </li>
            <li>
              <b>Always verify with a test recording</b> before relying on it in a real call.
            </li>
          </ul>
          <p>
            Do you understand the risk and want to enable it anyway? You won&apos;t be asked
            again.
          </p>
        </div>

        <div className="lsc-actions">
          <button type="button" className="lsc-btn lsc-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="lsc-btn lsc-btn-accept" onClick={onAccept} autoFocus>
            I understand — enable anyway
          </button>
        </div>
      </div>
    </div>
  );
}
