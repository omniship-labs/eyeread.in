import { openExternal } from '../lib/tauri';
import sponsors from '../data/sponsors.json';
import './about/about-window.css';

const OC_URL = 'https://opencollective.com/eyereadin';

const REPO_URL    = 'https://github.com/omniship-labs/eyeread.in';
const MJ_URL      = 'https://m.halinge.in';
const TERMS_URL   = 'https://github.com/omniship-labs/eyeread.in/blob/main/TERMS.md';
const PRIVACY_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/PRIVACY.md';

function getVersion() {
  try {
    if (typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ !== 'stable') {
      return `0.1.0 · ${__RELEASE_CHANNEL__}`;
    }
  } catch { /* */ }
  return '0.1.0';
}

export function AboutWindow() {
  return (
    <div className="aw-root">
      {/* drag region — clear strip at top, avoids traffic lights */}
      <div className="aw-titlebar" data-tauri-drag-region />

      <div className="aw-hero">
        <img className="aw-icon" src="/app-icon.png" alt="eyeread.in" draggable={false} />
        <div className="aw-name">eyeread.in</div>
        <div className="aw-version">{getVersion()}</div>
        <div className="aw-org">© 2026 OmniShip Labs</div>
      </div>

      <div className="aw-credit">
        Created with ❤️ by{' '}
        <span className="aw-link" onClick={() => openExternal(MJ_URL)}>MJ</span>
      </div>

      <div className="aw-divider" />

      <div className="aw-section">
        <div className="aw-section-label">Source &amp; License</div>
        <div className="aw-row">
          <span>Open source · AGPL-3.0</span>
          <span className="aw-link" onClick={() => openExternal(REPO_URL)}>GitHub ↗</span>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">Legal</div>
        <div className="aw-row">
          <span className="aw-link" onClick={() => openExternal(TERMS_URL)}>Terms of use ↗</span>
          <span className="aw-link" onClick={() => openExternal(PRIVACY_URL)}>Privacy policy ↗</span>
        </div>
      </div>

      <div className="aw-divider" />

      <div className="aw-section aw-section-supporters">
        <div className="aw-section-label">Supporters</div>
        {sponsors.length > 0 ? (
          <>
            <div className="aw-supporters-scroll">
              <SupporterGroup
                title="Sponsors"
                tier="sponsor"
                people={sponsors.filter((s) => s.tier === 'sponsor')}
                onOpen={openExternal}
              />
              <SupporterGroup
                title="Backers"
                tier="backer"
                people={sponsors.filter((s) => s.tier !== 'sponsor')}
                onOpen={openExternal}
              />
            </div>
            <span className="aw-link aw-supporters-all" onClick={() => openExternal(OC_URL)}>
              View all on Open Collective ↗
            </span>
          </>
        ) : (
          <div className="aw-supporters-empty">
            Be the first to{' '}
            <span className="aw-link" onClick={() => openExternal(OC_URL)}>support eyeread.in ↗</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SupporterGroup({ title, tier, people, onOpen }) {
  if (people.length === 0) return null;
  return (
    <div className={`aw-tier aw-tier-${tier}`}>
      <div className="aw-tier-label">{title}</div>
      <div className="aw-supporters-list">
        {people.map((s) => (
          <span
            key={s.profile || s.name}
            className="aw-supporter"
            onClick={s.profile ? () => onOpen(s.profile) : undefined}
            style={s.profile ? { cursor: 'pointer' } : undefined}
          >
            {s.image && (
              <img className="aw-supporter-avatar" src={s.image} alt="" draggable={false} />
            )}
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
