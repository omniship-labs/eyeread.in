Icon-only square button for toolbars and overlay controls; always pass a `label` for accessibility + tooltip.

```jsx
<IconButton label="Play" variant="accent"><PlayIcon/></IconButton>
<IconButton label="Settings"><SettingsIcon/></IconButton>
<IconButton label="Mirror" active><FlipIcon/></IconButton>
```

- **variant**: `ghost` (default), `solid`, `accent`. **active** gives an indigo toggle tint. **size**: `sm`·`md`·`lg`.
