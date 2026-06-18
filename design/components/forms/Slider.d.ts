import * as React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  label?: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Custom formatter for the readout, e.g. v => `${v} wpm`. */
  formatValue?: (v: number | undefined) => string;
  /** Shorthand suffix appended to the raw value when no formatValue. */
  suffix?: string;
}

/** Range slider with indigo fill + value readout. Used for scroll speed, text size, overlay opacity. */
export declare function Slider(props: SliderProps): JSX.Element;
