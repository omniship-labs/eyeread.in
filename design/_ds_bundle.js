/* @ds-bundle: {"format":3,"namespace":"TelepromptDDesignSystem_019e26","components":[{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Segmented","sourcePath":"components/forms/Segmented.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"ScriptViewer","sourcePath":"components/prompter/ScriptViewer.jsx"}],"sourceHashes":{"assets/lucide-icon.js":"c7fa21cc8477","components/display/Avatar.jsx":"9df8037cf840","components/display/Badge.jsx":"33d649a02779","components/display/Card.jsx":"5754528ce47d","components/forms/Button.jsx":"7b0fdf869b3a","components/forms/IconButton.jsx":"bdbb5f21a342","components/forms/Input.jsx":"fcb591a3591e","components/forms/Segmented.jsx":"a81272b57e84","components/forms/Slider.jsx":"0cd0089c90b9","components/forms/Switch.jsx":"e1aa70e5c86c","components/navigation/Tabs.jsx":"971aa94c839e","components/prompter/ScriptViewer.jsx":"df72b8bc70ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TelepromptDDesignSystem_019e26 = window.TelepromptDDesignSystem_019e26 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/lucide-icon.js
try { (() => {
/* eyeread.in — Lucide icon helper.
   Requires the Lucide UMD script loaded first (window.lucide).
   Exposes:
     tpdIconSVG(name, size=20, strokeWidth=2)  -> SVG markup string
     window.TpdIcon  -> React component <TpdIcon name="play" size={18}/>  (if React present)
   Icon names are kebab-case, e.g. "flip-horizontal-2". */
(function () {
  function toPascal(name) {
    return String(name).split('-').map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join('');
  }
  function tpdIconSVG(name, size, strokeWidth) {
    size = size || 20;
    strokeWidth = strokeWidth || 2;
    var node = window.lucide && window.lucide.icons ? window.lucide.icons[toPascal(name)] : null;
    if (!node) return '';
    var inner = node.map(function (child) {
      var tag = child[0],
        attrs = child[1] || {};
      return '<' + tag + ' ' + Object.keys(attrs).map(function (k) {
        return k + '="' + attrs[k] + '"';
      }).join(' ') + '/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  window.tpdIconSVG = tpdIconSVG;
  if (window.React) {
    window.TpdIcon = function (props) {
      var size = props.size || 20;
      return window.React.createElement('span', {
        className: props.className,
        style: Object.assign({
          display: 'inline-flex',
          flex: 'none'
        }, props.style || {}),
        dangerouslySetInnerHTML: {
          __html: tpdIconSVG(props.name, size, props.strokeWidth)
        }
      });
    };
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/lucide-icon.js", error: String((e && e.message) || e) }); }

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-avatar{
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s,36px); height:var(--_s,36px); flex:none;
  border-radius:50%; position:relative;
  font-family:var(--font-sans); font-weight:600; font-size:calc(var(--_s,36px) * 0.4);
  user-select:none;
}
/* Inner clip — keeps the image/initials circular without cutting the badge */
.tpd-avatar__inner{
  width:100%; height:100%; border-radius:50%; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface-3); color:var(--text-primary);
  border:1px solid var(--border-default);
}
.tpd-avatar img{ width:100%; height:100%; object-fit:cover; }
.tpd-avatar--accent .tpd-avatar__inner{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-avatar__status{
  position:absolute; right:-1px; bottom:-1px; width:30%; height:30%; min-width:8px; min-height:8px;
  border-radius:50%; border:2px solid var(--bg-base); background:var(--text-tertiary);
}
.tpd-avatar__status--online{ background:var(--success); }
.tpd-avatar__status--live{ background:var(--accent); box-shadow:var(--glow-accent-sm); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'avatar');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const SIZES = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64
};
function Avatar({
  src,
  name = '',
  size = 'md',
  accent = false,
  status,
  className = '',
  ...rest
}) {
  ensureCSS();
  const px = typeof size === 'number' ? size : SIZES[size] || 36;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const cls = ['tpd-avatar', accent ? 'tpd-avatar--accent' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      ['--_s']: px + 'px'
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "tpd-avatar__inner"
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials || '?'), status && /*#__PURE__*/React.createElement("span", {
    className: `tpd-avatar__status tpd-avatar__status--${status}`
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-badge{
  display:inline-flex; align-items:center; gap:5px;
  height:22px; padding:0 9px; border-radius:var(--radius-pill);
  font-family:var(--font-mono); font-size:11px; font-weight:500;
  letter-spacing:var(--tracking-label); text-transform:uppercase;
  border:1px solid transparent; white-space:nowrap;
}
.tpd-badge svg{ width:12px; height:12px; }
.tpd-badge__dot{ width:6px; height:6px; border-radius:50%; background:currentColor; flex:none; }
.tpd-badge--neutral{ background:var(--surface-2); color:var(--text-secondary); border-color:var(--border-default); }
.tpd-badge--accent{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-badge--record{ background:var(--record-subtle); color:var(--record-text); }
.tpd-badge--record .tpd-badge__dot{ box-shadow:var(--glow-record); animation:tpd-pulse 1.6s var(--ease-in-out) infinite; }
.tpd-badge--success{ background:rgba(52,211,153,0.13); color:var(--success); }
.tpd-badge--warning{ background:rgba(255,184,77,0.13); color:var(--warning); }

.tpd-badge--solid{ font-family:var(--font-sans); font-weight:600; letter-spacing:0; text-transform:none; }

@keyframes tpd-pulse{ 0%,100%{opacity:1} 50%{opacity:0.35} }
@media (prefers-reduced-motion: reduce){ .tpd-badge--record .tpd-badge__dot{ animation:none; } }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'badge');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Badge({
  tone = 'neutral',
  dot = false,
  solid = false,
  icon = null,
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = ['tpd-badge', `tpd-badge--${tone}`, solid ? 'tpd-badge--solid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "tpd-badge__dot"
  }), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-card{
  background:var(--surface-1); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); padding:var(--space-5);
  transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
}
.tpd-card--raised{ background:var(--surface-2); box-shadow:var(--shadow-lg); }
.tpd-card--glass{
  background:var(--glass-bg); backdrop-filter:var(--blur-glass); -webkit-backdrop-filter:var(--blur-glass);
  border-color:var(--glass-border);
}
.tpd-card--accent{ border-color:var(--accent-subtle-border); box-shadow:var(--glow-accent); }
.tpd-card--interactive{ cursor:pointer; }
.tpd-card--interactive:hover{ border-color:var(--border-strong); transform:translateY(-2px); box-shadow:var(--shadow-lg); }
.tpd-card--interactive:active{ transform:translateY(0); }
.tpd-card--pad-sm{ padding:var(--space-4); }
.tpd-card--pad-lg{ padding:var(--space-6); }
.tpd-card--pad-none{ padding:0; }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'card');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = ['tpd-card', variant !== 'default' ? `tpd-card--${variant}` : '', padding !== 'md' ? `tpd-card--pad-${padding}` : '', interactive ? 'tpd-card--interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject component CSS once. Classes reference design tokens via var(). */
const CSS = `
.tpd-btn{
  --_h:40px; --_px:18px; --_fs:15px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  height:var(--_h); padding:0 var(--_px); font-size:var(--_fs);
  font-family:var(--font-sans); font-weight:600; letter-spacing:-0.01em;
  border-radius:var(--radius-md); border:1px solid transparent;
  cursor:pointer; white-space:nowrap; user-select:none;
  transition:background var(--dur-fast) var(--ease-out),
             border-color var(--dur-fast) var(--ease-out),
             box-shadow var(--dur-fast) var(--ease-out),
             transform var(--dur-fast) var(--ease-out),
             color var(--dur-fast) var(--ease-out);
}
.tpd-btn:focus-visible{ outline:none; box-shadow:var(--ring); }
.tpd-btn:active{ transform:translateY(0.5px) scale(0.985); }
.tpd-btn[disabled]{ opacity:0.45; cursor:not-allowed; transform:none; box-shadow:none; }

.tpd-btn--sm{ --_h:32px; --_px:13px; --_fs:13px; border-radius:var(--radius-sm); }
.tpd-btn--lg{ --_h:48px; --_px:24px; --_fs:16px; border-radius:var(--radius-lg); }

.tpd-btn--primary{ background:var(--accent); color:var(--text-on-accent); box-shadow:var(--glow-accent-sm); }
.tpd-btn--primary:hover:not([disabled]){ background:var(--accent-hover); box-shadow:0 0 18px rgba(110,86,247,0.6); }
.tpd-btn--primary:active:not([disabled]){ background:var(--accent-press); }

.tpd-btn--secondary{ background:var(--surface-2); color:var(--text-primary); border-color:var(--border-default); }
.tpd-btn--secondary:hover:not([disabled]){ background:var(--surface-3); border-color:var(--border-strong); }

.tpd-btn--ghost{ background:transparent; color:var(--text-secondary); }
.tpd-btn--ghost:hover:not([disabled]){ background:var(--surface-hover); color:var(--text-primary); }

.tpd-btn--subtle{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-btn--subtle:hover:not([disabled]){ background:var(--accent-subtle-bg-hover); }

.tpd-btn--danger{ background:var(--record); color:#fff; box-shadow:var(--glow-record); }
.tpd-btn--danger:hover:not([disabled]){ background:var(--signal-600); }

.tpd-btn--block{ width:100%; }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'button');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = ['tpd-btn', `tpd-btn--${variant}`, size !== 'md' ? `tpd-btn--${size}` : '', block ? 'tpd-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled
  }, rest), iconLeft, children != null && /*#__PURE__*/React.createElement("span", null, children), iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-iconbtn{
  --_s:40px;
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s); height:var(--_s); padding:0;
  border-radius:var(--radius-md); border:1px solid transparent;
  background:transparent; color:var(--text-secondary); cursor:pointer;
  transition:background var(--dur-fast) var(--ease-out),
             color var(--dur-fast) var(--ease-out),
             border-color var(--dur-fast) var(--ease-out),
             transform var(--dur-fast) var(--ease-out),
             box-shadow var(--dur-fast) var(--ease-out);
}
.tpd-iconbtn svg{ width:20px; height:20px; display:block; }
.tpd-iconbtn:focus-visible{ outline:none; box-shadow:var(--ring); }
.tpd-iconbtn:active{ transform:scale(0.92); }
.tpd-iconbtn[disabled]{ opacity:0.4; cursor:not-allowed; }

.tpd-iconbtn--sm{ --_s:32px; border-radius:var(--radius-sm); }
.tpd-iconbtn--sm svg{ width:16px; height:16px; }
.tpd-iconbtn--lg{ --_s:48px; }
.tpd-iconbtn--lg svg{ width:22px; height:22px; }

.tpd-iconbtn--ghost:hover:not([disabled]){ background:var(--surface-hover); color:var(--text-primary); }
.tpd-iconbtn--solid{ background:var(--surface-2); border-color:var(--border-default); color:var(--text-primary); }
.tpd-iconbtn--solid:hover:not([disabled]){ background:var(--surface-3); }
.tpd-iconbtn--accent{ background:var(--accent); color:#fff; box-shadow:var(--glow-accent-sm); }
.tpd-iconbtn--accent:hover:not([disabled]){ background:var(--accent-hover); }
.tpd-iconbtn--active{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'iconbutton');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function IconButton({
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled = false,
  label,
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = ['tpd-iconbtn', `tpd-iconbtn--${variant}`, size !== 'md' ? `tpd-iconbtn--${size}` : '', active ? 'tpd-iconbtn--active' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    disabled: disabled,
    "aria-label": label,
    title: label
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-field{ display:flex; flex-direction:column; gap:7px; }
.tpd-field__label{ font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); }
.tpd-field__hint{ font-size:var(--text-xs); color:var(--text-tertiary); }
.tpd-field__error{ font-size:var(--text-xs); color:var(--record-text); }

.tpd-input-wrap{ position:relative; display:flex; align-items:center; }
.tpd-input-wrap__icon{ position:absolute; left:13px; display:flex; color:var(--text-tertiary); pointer-events:none; }
.tpd-input-wrap__icon svg{ width:17px; height:17px; }

.tpd-input{
  width:100%; height:var(--control-h-md);
  padding:0 14px; font-family:var(--font-sans); font-size:var(--text-base);
  color:var(--text-primary); background:var(--surface-1);
  border:1px solid var(--border-default); border-radius:var(--radius-md);
  transition:border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.tpd-input::placeholder{ color:var(--text-tertiary); }
.tpd-input:hover{ border-color:var(--border-strong); }
.tpd-input:focus{ outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-subtle-bg); background:var(--surface-2); }
.tpd-input--has-icon{ padding-left:38px; }
.tpd-input--error{ border-color:var(--record); }
.tpd-input--error:focus{ box-shadow:0 0 0 3px var(--record-subtle); }
.tpd-input:disabled{ opacity:0.5; cursor:not-allowed; }

textarea.tpd-input{ height:auto; padding:11px 14px; line-height:1.5; resize:vertical; min-height:96px; }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'input');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Input({
  label,
  hint,
  error,
  icon = null,
  multiline = false,
  className = '',
  id,
  ...rest
}) {
  ensureCSS();
  const Tag = multiline ? 'textarea' : 'input';
  const inputCls = ['tpd-input', icon && !multiline ? 'tpd-input--has-icon' : '', error ? 'tpd-input--error' : '', className].filter(Boolean).join(' ');
  const field = /*#__PURE__*/React.createElement("div", {
    className: "tpd-input-wrap"
  }, icon && !multiline && /*#__PURE__*/React.createElement("span", {
    className: "tpd-input-wrap__icon"
  }, icon), /*#__PURE__*/React.createElement(Tag, _extends({
    id: id,
    className: inputCls
  }, rest)));
  if (!label && !hint && !error) return field;
  return /*#__PURE__*/React.createElement("div", {
    className: "tpd-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "tpd-field__label",
    htmlFor: id
  }, label), field, error ? /*#__PURE__*/React.createElement("span", {
    className: "tpd-field__error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "tpd-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Segmented.jsx
try { (() => {
const CSS = `
.tpd-seg{
  display:inline-flex; padding:3px; gap:2px;
  background:var(--surface-1); border:1px solid var(--border-default);
  border-radius:var(--radius-md);
}
.tpd-seg--block{ display:flex; width:100%; }
.tpd-seg--block .tpd-seg__btn{ flex:1; }
.tpd-seg__btn{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  height:30px; padding:0 14px; border:none; background:transparent; cursor:pointer;
  font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600;
  color:var(--text-secondary); border-radius:var(--radius-sm); white-space:nowrap;
  transition:color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.tpd-seg__btn svg{ width:15px; height:15px; }
.tpd-seg__btn:hover{ color:var(--text-primary); }
.tpd-seg__btn[aria-pressed="true"]{
  background:var(--accent-subtle-bg); color:var(--accent-text);
  box-shadow:inset 0 0 0 1px var(--accent-subtle-border);
}
.tpd-seg--sm .tpd-seg__btn{ height:26px; padding:0 11px; font-size:var(--text-xs); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'segmented');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Segmented({
  options = [],
  value,
  onChange,
  size = 'md',
  block = false,
  className = ''
}) {
  ensureCSS();
  const cls = ['tpd-seg', size === 'sm' ? 'tpd-seg--sm' : '', block ? 'tpd-seg--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    role: "group"
  }, options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const lbl = typeof opt === 'string' ? opt : opt.label;
    const icon = typeof opt === 'string' ? null : opt.icon;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      className: "tpd-seg__btn",
      "aria-pressed": value === val,
      onClick: () => onChange && onChange(val)
    }, icon, lbl != null && /*#__PURE__*/React.createElement("span", null, lbl));
  }));
}
Object.assign(__ds_scope, { Segmented });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Segmented.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-slider{ display:flex; flex-direction:column; gap:9px; width:100%; }
.tpd-slider__top{ display:flex; align-items:baseline; justify-content:space-between; }
.tpd-slider__label{ font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); }
.tpd-slider__val{ font-family:var(--font-mono); font-size:var(--text-xs); color:var(--accent-text); }
.tpd-slider input[type=range]{
  -webkit-appearance:none; appearance:none; width:100%; height:6px; margin:6px 0;
  background:var(--surface-3); border-radius:var(--radius-pill); cursor:pointer;
}
.tpd-slider input[type=range]::-webkit-slider-runnable-track{ height:6px; border-radius:var(--radius-pill); background:transparent; }
.tpd-slider input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none; appearance:none; width:18px; height:18px; margin-top:-6px;
  border-radius:50%; background:#fff; border:3px solid var(--accent);
  box-shadow:var(--glow-accent-sm); transition:transform var(--dur-fast) var(--ease-out);
}
.tpd-slider input[type=range]::-webkit-slider-thumb:hover{ transform:scale(1.12); }
.tpd-slider input[type=range]::-moz-range-thumb{
  width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid var(--accent);
  box-shadow:var(--glow-accent-sm); cursor:pointer;
}
.tpd-slider input[type=range]::-moz-range-track{ height:6px; border-radius:var(--radius-pill); background:var(--surface-3); }
.tpd-slider input[type=range]:focus-visible{ outline:none; }
.tpd-slider input[type=range]:focus-visible::-webkit-slider-thumb{ box-shadow:var(--ring); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'slider');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Slider({
  label,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue,
  suffix = '',
  id,
  ...rest
}) {
  ensureCSS();
  const shown = value != null ? value : defaultValue;
  const display = formatValue ? formatValue(shown) : shown != null ? `${shown}${suffix}` : null;
  // Fill the track up to the thumb using a gradient.
  const pct = shown != null ? (shown - min) / (max - min) * 100 : 0;
  const trackStyle = {
    background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "tpd-slider"
  }, (label || display != null) && /*#__PURE__*/React.createElement("div", {
    className: "tpd-slider__top"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "tpd-slider__label"
  }, label), display != null && /*#__PURE__*/React.createElement("span", {
    className: "tpd-slider__val"
  }, display)), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    style: trackStyle
  }, rest)));
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-switch{ display:inline-flex; align-items:center; gap:11px; cursor:pointer; user-select:none; }
.tpd-switch[data-disabled="true"]{ opacity:0.45; cursor:not-allowed; }
.tpd-switch__track{
  position:relative; width:42px; height:24px; flex:none;
  background:var(--surface-3); border:1px solid var(--border-default);
  border-radius:var(--radius-pill);
  transition:background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.tpd-switch__thumb{
  position:absolute; top:2px; left:2px; width:18px; height:18px;
  background:var(--paper-200); border-radius:50%;
  box-shadow:var(--shadow-sm);
  transition:transform var(--dur-base) var(--ease-spring), background var(--dur-base) var(--ease-out);
}
.tpd-switch input{ position:absolute; opacity:0; width:0; height:0; }
.tpd-switch input:checked + .tpd-switch__track{
  background:var(--accent); border-color:transparent; box-shadow:var(--glow-accent-sm);
}
.tpd-switch input:checked + .tpd-switch__track .tpd-switch__thumb{ transform:translateX(18px); background:#fff; }
.tpd-switch input:focus-visible + .tpd-switch__track{ box-shadow:var(--ring); }
.tpd-switch__label{ font-family:var(--font-sans); font-size:var(--text-base); color:var(--text-primary); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'switch');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  label,
  id,
  ...rest
}) {
  ensureCSS();
  return /*#__PURE__*/React.createElement("label", {
    className: "tpd-switch",
    "data-disabled": disabled,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "checkbox",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "tpd-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tpd-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "tpd-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const CSS = `
.tpd-tabs{ display:flex; gap:2px; position:relative; }
.tpd-tabs--line{ border-bottom:1px solid var(--border-subtle); gap:4px; }
.tpd-tabs--pill{ background:var(--surface-1); border:1px solid var(--border-default); border-radius:var(--radius-md); padding:3px; gap:2px; display:inline-flex; }

.tpd-tab{
  display:inline-flex; align-items:center; gap:7px; cursor:pointer; border:none; background:transparent;
  font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-tertiary);
  transition:color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.tpd-tab svg{ width:16px; height:16px; }
.tpd-tab:hover{ color:var(--text-secondary); }

.tpd-tabs--line .tpd-tab{ padding:10px 4px; position:relative; }
.tpd-tabs--line .tpd-tab[aria-selected="true"]{ color:var(--text-primary); }
.tpd-tabs--line .tpd-tab[aria-selected="true"]::after{
  content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px;
  background:var(--accent); border-radius:2px; box-shadow:var(--glow-accent-sm);
}

.tpd-tabs--pill .tpd-tab{ padding:7px 14px; border-radius:var(--radius-sm); }
.tpd-tabs--pill .tpd-tab[aria-selected="true"]{ background:var(--accent-subtle-bg); color:var(--accent-text); box-shadow:inset 0 0 0 1px var(--accent-subtle-border); }

.tpd-tab__count{ font-family:var(--font-mono); font-size:10px; padding:1px 6px; border-radius:var(--radius-pill); background:var(--surface-3); color:var(--text-tertiary); }
.tpd-tab[aria-selected="true"] .tpd-tab__count{ background:var(--accent-subtle-bg); color:var(--accent-text); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'tabs');
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'line',
  className = ''
}) {
  ensureCSS();
  const cls = ['tpd-tabs', `tpd-tabs--${variant}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    role: "tablist"
  }, items.map(it => {
    const val = typeof it === 'string' ? it : it.value;
    const lbl = typeof it === 'string' ? it : it.label;
    const icon = typeof it === 'string' ? null : it.icon;
    const count = typeof it === 'string' ? null : it.count;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      role: "tab",
      className: "tpd-tab",
      "aria-selected": value === val,
      onClick: () => onChange && onChange(val)
    }, icon, /*#__PURE__*/React.createElement("span", null, lbl), count != null && /*#__PURE__*/React.createElement("span", {
      className: "tpd-tab__count"
    }, count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/prompter/ScriptViewer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.tpd-script{
  font-family:var(--font-prompt); font-weight:500; line-height:var(--leading-reading);
  letter-spacing:-0.01em; color:var(--text-primary);
}
.tpd-script--center{ text-align:center; }
.tpd-script--mirror{ transform:scaleX(-1); }
.tpd-script__w{ transition:color var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
.tpd-script__w--spoken{ color:var(--prompt-upcoming); opacity:0.45; }
.tpd-script__w--upcoming{ color:var(--prompt-spoken); opacity:0.7; }
.tpd-script__w--active{ color:var(--prompt-active); opacity:1; font-weight:600; text-shadow:var(--glow-text); }

.tpd-script__sizes-sm{ font-size:var(--prompt-sm); }
.tpd-script__sizes-md{ font-size:var(--prompt-md); }
.tpd-script__sizes-lg{ font-size:var(--prompt-lg); }
.tpd-script__sizes-xl{ font-size:var(--prompt-xl); }
`;
let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'script');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const SIZE_CLASS = {
  sm: 'tpd-script__sizes-sm',
  md: 'tpd-script__sizes-md',
  lg: 'tpd-script__sizes-lg',
  xl: 'tpd-script__sizes-xl'
};
function ScriptViewer({
  text = '',
  active = 0,
  size = 'md',
  mirror = false,
  align = 'left',
  className = '',
  style = {},
  ...rest
}) {
  ensureCSS();
  const words = React.useMemo(() => text.split(/(\s+)/), [text]);
  // active counts non-space tokens; map to token index
  let wordCount = -1;
  const cls = ['tpd-script', typeof size === 'string' ? SIZE_CLASS[size] : '', align === 'center' ? 'tpd-script--center' : '', mirror ? 'tpd-script--mirror' : '', className].filter(Boolean).join(' ');
  const inlineStyle = typeof size === 'number' ? {
    ...style,
    fontSize: size + 'px'
  } : style;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: inlineStyle
  }, rest), words.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    wordCount += 1;
    const wc = wordCount;
    const stateCls = wc < active ? 'tpd-script__w--spoken' : wc === active ? 'tpd-script__w--active' : 'tpd-script__w--upcoming';
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: `tpd-script__w ${stateCls}`
    }, tok);
  }));
}
Object.assign(__ds_scope, { ScriptViewer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/prompter/ScriptViewer.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Segmented = __ds_scope.Segmented;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ScriptViewer = __ds_scope.ScriptViewer;

})();
