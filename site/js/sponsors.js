/* ============================================================
   eyeread.in · marketing site — live backers & sponsors
   ------------------------------------------------------------
   Fetches financial contributors from Open Collective IN THE
   BROWSER at page load, so the section is always up to date with
   no rebuild. Open Collective's members/all.json endpoint sends
   permissive CORS headers, so the client fetch works directly.

   Tiers are derived from lifetime total (the all.json feed has no
   tier name): >= sponsorThreshold → "sponsor", otherwise "backer".
   ============================================================ */

import { icon } from './icons.js';

const escapeHtml = (s = '') =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const initials = (name = '?') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';

/** One avatar chip — image when available, initials fallback otherwise. */
function avatarChip(member, size) {
  const name = escapeHtml(member.name || 'Anonymous');
  const href = member.profile ? escapeHtml(member.profile) : null;
  const inner = member.image
    ? `<img src="${escapeHtml(member.image)}" alt="${name}" loading="lazy" width="${size}" height="${size}"
         onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sp-fallback',textContent:'${initials(member.name)}'}))"/>`
    : `<span class="sp-fallback">${initials(member.name)}</span>`;
  const chip = `<span class="sp-avatar" style="--sp-size:${size}px" title="${name}">${inner}</span>`;
  return href
    ? `<a class="sp-link" href="${href}" target="_blank" rel="noopener">${chip}</a>`
    : chip;
}

/**
 * Fetch + render backers/sponsors into the given mount element.
 * @param {HTMLElement} mount   the .sp-mount container
 * @param {object} cfg          config.sponsors
 */
export async function renderSponsors(mount, cfg) {
  const { collectiveSlug, sponsorThreshold = 100, emptyMessage, errorMessage, ctaHref } = cfg;
  const url = `https://opencollective.com/${collectiveSlug}/members/all.json`;

  mount.innerHTML = `<div class="sp-status">Loading backers…</div>`;

  let members;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    members = await res.json();
  } catch {
    mount.innerHTML = `<a class="sp-status sp-error" href="${escapeHtml(ctaHref)}" target="_blank" rel="noopener">${escapeHtml(errorMessage)}</a>`;
    return;
  }

  const backers = (Array.isArray(members) ? members : [])
    .filter((m) => m.role === 'BACKER' && m.isActive && (m.totalAmountDonated ?? 0) > 0)
    .sort((a, b) => (b.totalAmountDonated ?? 0) - (a.totalAmountDonated ?? 0));

  if (backers.length === 0) {
    mount.innerHTML = `<a class="sp-status" href="${escapeHtml(ctaHref)}" target="_blank" rel="noopener">${escapeHtml(emptyMessage)}</a>`;
    return;
  }

  const sponsors = backers.filter((m) => (m.totalAmountDonated ?? 0) >= sponsorThreshold);
  const others = backers.filter((m) => (m.totalAmountDonated ?? 0) < sponsorThreshold);

  const groups = [];
  if (sponsors.length) {
    groups.push(`
      <div class="sp-group">
        <div class="sp-group-label">${icon('heart', 12)} Sponsors</div>
        <div class="sp-row sp-row-lg">${sponsors.map((m) => avatarChip(m, 64)).join('')}</div>
      </div>`);
  }
  if (others.length) {
    groups.push(`
      <div class="sp-group">
        <div class="sp-group-label">${icon('star', 12)} Backers</div>
        <div class="sp-row">${others.map((m) => avatarChip(m, 44)).join('')}</div>
      </div>`);
  }

  mount.innerHTML = groups.join('');
}

export default renderSponsors;
