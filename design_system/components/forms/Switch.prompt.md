Toggle for binary settings (Mirror text, Hide from screen-share, Auto-scroll). Indigo glowing track when on.

```jsx
<Switch label="Hide from screen-share" defaultChecked />
<Switch label="Mirror text" onChange={e => setMirror(e.target.checked)} />
```
