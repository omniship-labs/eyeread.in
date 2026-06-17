import * as React from 'react';

export interface SegmentedOption {
  value: string;
  label?: string;
  /** Optional leading icon SVG. */
  icon?: React.ReactNode;
}

export interface SegmentedProps {
  /** String options, or {value,label,icon} objects. */
  options: Array<string | SegmentedOption>;
  /** Currently selected value (controlled). */
  value: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  /** Stretch to fill width, equal segments. */
  block?: boolean;
  className?: string;
}

/** Segmented control for 2–4 mutually exclusive choices — e.g. timer mode (Off / Count-up / Countdown). */
export declare function Segmented(props: SegmentedProps): JSX.Element;
