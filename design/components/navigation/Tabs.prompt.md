Tab navigation — `line` (underline) or `pill` (segmented). Active tab uses the indigo accent.

```jsx
<Tabs value={tab} onChange={setTab} items={[
  { value:'scripts', label:'Scripts', count:12 },
  { value:'recs', label:'Recordings' },
  { value:'settings', label:'Settings' },
]} />
```
