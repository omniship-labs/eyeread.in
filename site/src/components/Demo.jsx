import { Fragment, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

/* Slide heading is an array of lines → join with <br/> */
function Lines({ items }) {
  return items.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

function Slide({ slide }) {
  return (
    <div className="slide">
      <div className="slide-ey">{slide.eyebrow}</div>
      <div className="slide-h">
        <Lines items={slide.heading} />
      </div>
    </div>
  );
}

/* The teleprompter line, shared shape: spoken → active → upcoming */
function PrompterLine({ spoken, active, upcoming }) {
  return (
    <>
      <span className="ov-spoken">{spoken}</span>
      <span className="ov-active">{active}</span>
      <span className="ov-next">{upcoming}</span>
    </>
  );
}

export default function Demo({ data }) {
  const wrapRef = useRef(null);
  const [pct, setPct] = useState(60);
  const dragging = useRef(false);

  const setFromX = (clientX) => {
    const r = wrapRef.current.getBoundingClientRect();
    setPct(Math.max(5, Math.min(95, ((clientX - r.left) / r.width) * 100)));
  };

  const onDown = (e) => {
    dragging.current = true;
    wrapRef.current.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e) => dragging.current && setFromX(e.clientX);
  const stop = () => (dragging.current = false);

  return (
    <div className="demo">
      <div className="demo-badge">
        <span className="dot dot-green" />
        {data.cameraBadge}
      </div>

      <div className="screen-frame">
        <div
          className="slider"
          ref={wrapRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={stop}
          onPointerCancel={stop}
        >
          {/* base: slide without overlay */}
          <Slide slide={data.slide} />

          {/* reveal layer: same slide + floating prompter, clipped by the handle */}
          <div
            className="slider-reveal"
            style={{ clipPath: `inset(0 ${(100 - pct).toFixed(1)}% 0 0)` }}
          >
            <Slide slide={data.slide} />
            <div className="float-overlay">
              <div className="ov-head">
                <span className="dot" />
                <span className="ov-timer">{data.overlay.timer}</span>
                <span className="ov-tag">
                  <Icon name="eye-off" size={10} /> {data.overlay.tag}
                </span>
              </div>
              <div className="ov-line">
                <PrompterLine
                  spoken={data.overlay.spoken}
                  active={data.overlay.active}
                  upcoming={data.overlay.upcoming}
                />
              </div>
            </div>
          </div>

          <div className="slider-handle" style={{ left: `${pct.toFixed(1)}%` }}>
            <span className="slider-knob">
              <Icon name="chevrons" size={14} />
            </span>
          </div>
          <span className="slider-tag slider-tag-l">WITH OVERLAY</span>
          <span className="slider-tag slider-tag-r">WITHOUT</span>
        </div>
      </div>

      <div className="invis-badge">
        <span className="dot dot-green" />
        {data.invisibleBadge}
      </div>
    </div>
  );
}

export { PrompterLine };
