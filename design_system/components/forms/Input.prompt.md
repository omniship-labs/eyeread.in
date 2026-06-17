Text input / textarea with optional label, hint, error, and leading icon. Indigo focus ring.

```jsx
<Input label="Script title" placeholder="Q3 keynote" />
<Input icon={<SearchIcon/>} placeholder="Search scripts" />
<Input label="Notes" multiline hint="Only you can see these" />
<Input label="Email" error="That address is taken" />
```

- **multiline** renders a resizable textarea. **error** turns the border red and replaces **hint**.
