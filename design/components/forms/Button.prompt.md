Action button — indigo-accent primary with a soft glow; use for the one primary action per view, secondary/ghost for the rest.

```jsx
<Button variant="primary" iconLeft={<PlayIcon/>}>Start prompting</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="danger" iconLeft={<RecIcon/>}>Stop recording</Button>
```

- **variant**: `primary` (glowing indigo), `secondary` (raised surface), `ghost` (transparent), `subtle` (tinted indigo), `danger` (record red).
- **size**: `sm` · `md` (default) · `lg`. **block** stretches full width.
- Pass icons via `iconLeft` / `iconRight` as SVG nodes (Lucide). Active state nudges down + scales slightly; focus shows the indigo ring.
