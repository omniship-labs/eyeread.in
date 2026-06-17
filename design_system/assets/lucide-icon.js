/* teleprompt.d — Lucide icon helper.
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
    var node = (window.lucide && window.lucide.icons) ? window.lucide.icons[toPascal(name)] : null;
    if (!node) return '';
    var inner = node.map(function (child) {
      var tag = child[0], attrs = child[1] || {};
      return '<' + tag + ' ' + Object.keys(attrs).map(function (k) {
        return k + '="' + attrs[k] + '"';
      }).join(' ') + '/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + strokeWidth +
      '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  window.tpdIconSVG = tpdIconSVG;
  if (window.React) {
    window.TpdIcon = function (props) {
      var size = props.size || 20;
      return window.React.createElement('span', {
        className: props.className,
        style: Object.assign({ display: 'inline-flex', flex: 'none' }, props.style || {}),
        dangerouslySetInnerHTML: { __html: tpdIconSVG(props.name, size, props.strokeWidth) },
      });
    };
  }
})();
