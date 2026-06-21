import { PrompterLine } from './Demo.jsx';

export default function HowItWorks({ data }) {
  return (
    <section className="section how">
      <div className="how-grid">
        <div className="how-steps">
          <div className="sec-ey sec-ey-l">{data.eyebrow}</div>
          <h2 className="sec-h sec-h-l">{data.heading}</h2>
          <ol className="steps">
            {data.steps.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="step-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="how-visual">
          <div className="how-ov">
            <div className="how-ov-h">
              <span className="dot" />
              {data.preview.header}
            </div>
            <div className="how-ov-txt">
              <PrompterLine
                spoken={data.preview.spoken}
                active={data.preview.active}
                upcoming={data.preview.upcoming}
              />
            </div>
          </div>
          <div className="how-caption">{data.preview.caption}</div>
        </div>
      </div>
    </section>
  );
}
