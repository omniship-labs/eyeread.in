// Design-system Input (design/components/forms/Input.jsx): a text field, or a
// textarea with `multiline`. Labels are left to the surrounding settings row.
export function Input({ multiline = false, error = false, className = '', ...rest }) {
  const Tag = multiline ? 'textarea' : 'input';
  const cls = ['er-input', error ? 'er-input--error' : '', className].filter(Boolean).join(' ');
  return <Tag className={cls} {...rest} />;
}
