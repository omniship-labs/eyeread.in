Range slider with an indigo fill and live readout. Used for scroll speed, text size, and overlay opacity.

```jsx
<Slider label="Scroll speed" min={60} max={240} defaultValue={142} formatValue={v => `${v} wpm`} />
<Slider label="Text size" min={22} max={72} defaultValue={46} suffix="px" />
<Slider label="Opacity" min={20} max={100} defaultValue={70} suffix="%" />
```

- Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). The fill tracks the shown value.
