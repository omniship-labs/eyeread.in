import { omnishipMark } from '../assets.js';

// The "window to the outside world" — eyeread.in's portal up to the OmniShip
// Labs collective. Warm Beacon coral glowing through the site's indigo dark.
export default function Collective({ data }) {
  return (
    <div className="collective-wrap">
      <a className="collective" href={data.href} target="_blank" rel="noopener noreferrer">
        <span className="collective-glow" aria-hidden="true" />
        <span className="collective-pane">
          <img src={omnishipMark} alt="" width={34} height={34} draggable={false} />
        </span>
        <span className="collective-body">
          <span className="collective-kicker">{data.kicker}</span>
          <span className="collective-name">
            OmniShip<span> Labs</span>
          </span>
          <span className="collective-blurb">{data.blurb}</span>
        </span>
        <span className="collective-cta">
          {data.cta}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </a>
    </div>
  );
}
