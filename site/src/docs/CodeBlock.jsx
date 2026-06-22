/* A plain, dependency-free code block for the docs. No syntax highlighting —
   the design system's mono font + surface tokens carry the styling. `label`
   renders a small caption strip (e.g. "bash" or a file path). */
export function CodeBlock({ children, label }) {
  return (
    <div className="doc-code">
      {label && <span className="doc-code-label">{label}</span>}
      <pre className="doc-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}

// Inline code/monospace token (commands, paths, identifiers).
export function Code({ children }) {
  return <code className="doc-inline">{children}</code>;
}

export default CodeBlock;
