import { Button } from './Button';

// Generic status row for a single OS permission: shows a status pill once
// granted, otherwise a button that either re-triggers the native prompt or,
// once denied, deep-links to the relevant System Settings pane (macOS can't
// re-prompt for a denied permission — the user has to flip it manually).
export function PermissionRow({ label, hint, state, stateLabels, onRequest, onOpenSettings }) {
  return (
    <div className="set-row">
      <div className="set-info">
        <b>{label}</b>
        <span>
          {state === 'denied' && stateLabels.deniedHint ? stateLabels.deniedHint : hint}
        </span>
      </div>
      {state === 'granted' ? (
        <span className="set-status-ok">{stateLabels.granted}</span>
      ) : (
        <Button
          size="sm"
          variant={state === 'denied' ? 'secondary' : 'primary'}
          onClick={state === 'denied' ? onOpenSettings : onRequest}
        >
          {state === 'denied'
            ? stateLabels.openSettings
            : (stateLabels[state] ?? stateLabels.prompt)}
        </Button>
      )}
    </div>
  );
}
