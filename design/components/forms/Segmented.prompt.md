Segmented control for 2–4 exclusive choices. Indigo-tinted selected segment. Great for the timer mode and reading layouts.

```jsx
<Segmented value={mode} onChange={setMode} options={[
  { value:'off', label:'Off' },
  { value:'up', label:'Count up', icon:<TimerIcon/> },
  { value:'down', label:'Countdown', icon:<HourglassIcon/> },
]} />
```

- Controlled only (`value` + `onChange`). **block** makes equal-width full-bleed segments.
