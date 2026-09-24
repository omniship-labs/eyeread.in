// Design-system Badge (design/components/display/Badge.jsx): a compact status
// pill. Tones: neutral, accent, success, warning, record.
export function Badge({
  tone = 'neutral',
  dot = false,
  solid = false,
  icon = null,
  children,
  ...rest
}) {
  const cls = ['er-badge', `er-badge--${tone}`, solid ? 'er-badge--solid' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="er-badge__dot" />}
      {icon}
      {children}
    </span>
  );
}
