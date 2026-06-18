The reading panel — the heart of teleprompt.d. Spoken words dim, the active word glows white, upcoming words stay readable. Drive `active` from the voice-detection word index so highlighting tracks speech.

```jsx
<ScriptViewer
  text="Look at the lens and let the words come to you."
  active={6}
  size="lg"
/>
<ScriptViewer text={script} active={wordIdx} size={52} mirror align="center" />
```

- **size**: `sm`·`md`·`lg`·`xl` or a pixel number. **mirror** flips for beam-splitter glass. **align** left/center.
- Wrap in a `Card variant="glass"` to build the overlay.
