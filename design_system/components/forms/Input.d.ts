import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper text below the control. */
  hint?: string;
  /** Error message — turns the field red and replaces the hint. */
  error?: string;
  /** Leading icon SVG (single-line only). */
  icon?: React.ReactNode;
  /** Render a resizable <textarea> instead of an <input>. */
  multiline?: boolean;
}

/** Text input / textarea with label, hint, error, and optional leading icon. */
export declare function Input(props: InputProps): JSX.Element;
