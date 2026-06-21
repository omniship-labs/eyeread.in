/* ============================================================
   eyeread.in · marketing site — config → DOM renderer
   ------------------------------------------------------------
   Turns the `config` object into the page's markup. Keeping the
   render here (rather than hand-written HTML) is what makes the
   site config-driven: edit config.js, the page follows.
   ============================================================ */

import { icon } from './icons.js';

const esc = (s = '') =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** Render a headline array where string items are plain and {emphasis} is accented. */
const headline = (parts) =>
  parts
    .map((p) => (typeof p === 'string' ? esc(p) : `<em>${esc(p.emphasis)}</em>`))
    .join('<br/>');

function renderNav(c) {
  return `
  <nav class="nav">
    <div class="nav-inner">
      <a class="brand" href="#top">
        <img src="${esc(c.brand.logo)}" alt="${esc(c.brand.name + c.brand.tld)}" width="28" height="28"/>
        <span class="brand-word">${esc(c.brand.name)}<span>${esc(c.brand.tld)}</span></span>
      </a>
      <div class="nav-right">
        <a class="btn btn-ghost btn-sm" href="${esc(c.links.github)}" target="_blank" rel="noopener">
          ${icon('github', 15)} ${esc(c.nav.githubLabel)}
        </a>
        <a class="btn btn-accent btn-sm" href="${esc(c.links.download)}">${esc(c.nav.cta)}</a>
      </div>
    </div>
  </nav>`;
}

function renderHero(c) {
  const h = c.hero;
  return `
  <section class="hero" id="top">
    <div class="glow glow-top"></div>
    <div class="glow glow-btm"></div>

    <div class="hero-badges">
      <span class="eyebrow"><span class="dot"></span>${esc(h.eyebrow)}</span>
      <a class="pill-link" href="${esc(c.links.github)}" target="_blank" rel="noopener">
        ${icon('github', 13)}${icon('star', 12)} ${esc(h.star)}
      </a>
    </div>

    <h1>${headline(h.headline)}</h1>
    <p class="hero-sub">${esc(h.subhead)}</p>

    <div class="cta-row">
      <a class="btn btn-accent btn-lg" href="${esc(h.primaryCta.href)}">${icon('apple', 17)} ${esc(h.primaryCta.label)}</a>
      <a class="btn btn-ghost btn-lg" href="${esc(h.secondaryCta.href)}" target="_blank" rel="noopener">${icon('github', 16)} ${esc(h.secondaryCta.label)}</a>
    </div>
    <p class="hero-note">${icon('check', 13)} ${esc(h.note)}</p>

    ${renderDemo(c)}
  </section>`;
}

function renderDemo(c) {
  const d = c.demo;
  return `
  <div class="demo">
    <div class="demo-badge"><span class="dot dot-green"></span>${esc(d.cameraBadge)}</div>

    <div class="screen-frame">
      <div class="slider" id="slider">
        <!-- base: slide with no overlay -->
        <div class="slide">
          <div class="slide-ey">${esc(d.slide.eyebrow)}</div>
          <div class="slide-h">${d.slide.heading.map(esc).join('<br/>')}</div>
        </div>

        <!-- reveal layer: same slide + the floating prompter, clipped by the handle -->
        <div class="slider-reveal" id="sliderReveal">
          <div class="slide">
            <div class="slide-ey">${esc(d.slide.eyebrow)}</div>
            <div class="slide-h">${d.slide.heading.map(esc).join('<br/>')}</div>
          </div>
          <div class="float-overlay">
            <div class="ov-head">
              <span class="dot"></span>
              <span class="ov-timer">${esc(d.overlay.timer)}</span>
              <span class="ov-tag">${icon('eye-off', 10)} ${esc(d.overlay.tag)}</span>
            </div>
            <div class="ov-line"><span class="ov-spoken">${esc(d.overlay.spoken)}</span><span class="ov-active">${esc(d.overlay.active)}</span><span class="ov-next">${esc(d.overlay.upcoming)}</span></div>
          </div>
        </div>

        <div class="slider-handle" id="sliderHandle">
          <span class="slider-knob">${icon('arrow', 14)}</span>
        </div>
        <span class="slider-tag slider-tag-l">WITH OVERLAY</span>
        <span class="slider-tag slider-tag-r">WITHOUT</span>
      </div>
    </div>

    <div class="invis-badge"><span class="dot dot-green"></span>${esc(d.invisibleBadge)}</div>
  </div>`;
}

function renderFeatures(c) {
  const f = c.features;
  return `
  <section class="section features">
    <div class="sec-ey">${esc(f.eyebrow)}</div>
    <h2 class="sec-h">${esc(f.heading)}</h2>
    <div class="feat-grid">
      ${f.items
        .map(
          (it) => `
        <article class="feat">
          <div class="feat-icon">${icon(it.icon, 20)}</div>
          <h3 class="feat-h">${esc(it.title)}</h3>
          <p class="feat-p">${esc(it.body)}</p>
          <span class="tag">${esc(it.tag)}</span>
        </article>`
        )
        .join('')}
    </div>
  </section>`;
}

function renderHow(c) {
  const h = c.how;
  return `
  <section class="section how">
    <div class="how-grid">
      <div class="how-steps">
        <div class="sec-ey sec-ey-l">${esc(h.eyebrow)}</div>
        <h2 class="sec-h sec-h-l">${esc(h.heading)}</h2>
        <ol class="steps">
          ${h.steps
            .map(
              (s, i) => `
            <li class="step">
              <span class="step-num">${i + 1}</span>
              <div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
            </li>`
            )
            .join('')}
        </ol>
      </div>
      <div class="how-visual">
        <div class="how-ov">
          <div class="how-ov-h"><span class="dot"></span>${esc(h.preview.header)}</div>
          <div class="how-ov-txt"><span class="ov-spoken">${esc(h.preview.spoken)}</span><span class="ov-active">${esc(h.preview.active)}</span><span class="ov-next">${esc(h.preview.upcoming)}</span></div>
        </div>
        <div class="how-caption">${esc(h.preview.caption)}</div>
      </div>
    </div>
  </section>`;
}

function renderOss(c) {
  const o = c.oss;
  return `
  <section class="section">
    <div class="oss">
      <div class="oss-left">
        <h2>${esc(o.heading)}</h2>
        <p>${esc(o.body)}</p>
        <a class="repo-link" href="${esc(c.links.github)}" target="_blank" rel="noopener">
          ${icon('github', 15)} ${esc(c.links.repo)}
          <span class="repo-badge">${esc(o.repoBadge)}</span>
        </a>
      </div>
      <div class="oss-right">
        ${o.guarantees
          .map(
            (g) => `
          <div class="oss-row ${g.icon === 'info' ? 'oss-row-muted' : ''}">
            ${icon(g.icon, 18)}
            <div><h4>${esc(g.title)}</h4><p>${esc(g.body)}</p></div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function renderSponsorsSection(c) {
  const s = c.sponsors;
  return `
  <section class="section sponsors">
    <div class="sec-ey">${esc(s.eyebrow)}</div>
    <h2 class="sec-h">${esc(s.heading)}</h2>
    <p class="sponsors-sub">${esc(s.subhead)}</p>
    <!-- Populated live from Open Collective by sponsors.js -->
    <div class="sp-mount" id="sponsorsMount"><div class="sp-status">Loading backers…</div></div>
    <a class="btn btn-ghost" href="${esc(s.ctaHref)}" target="_blank" rel="noopener">${icon('heart', 16)} ${esc(s.ctaLabel)}</a>
  </section>`;
}

function renderFooter(c) {
  const f = c.footer;
  return `
  <footer class="footer">
    <a class="brand" href="#top">
      <img src="${esc(c.brand.logo)}" alt="${esc(c.brand.name + c.brand.tld)}" width="22" height="22"/>
      <span class="brand-word brand-word-sm">${esc(c.brand.name)}<span>${esc(c.brand.tld)}</span></span>
    </a>
    <div class="footer-right">
      ${f.links
        .map(
          (l) =>
            `<a class="footer-link ${l.mono ? 'mono' : ''}" href="${esc(l.href)}" ${l.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`
        )
        .join('')}
      <span class="footer-copy">${esc(f.copy)}</span>
    </div>
  </footer>`;
}

/** Build the full page body from config and inject into `root`. */
export function renderPage(root, c) {
  root.innerHTML = [
    renderNav(c),
    `<main>`,
    renderHero(c),
    renderFeatures(c),
    renderHow(c),
    renderOss(c),
    renderSponsorsSection(c),
    `</main>`,
    renderFooter(c),
  ].join('\n');
}

export default renderPage;
