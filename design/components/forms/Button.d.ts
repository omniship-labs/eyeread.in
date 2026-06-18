import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Primary action button for teleprompt.d.
 * @startingPoint section="Forms" subtitle="Accent button with glow, 5 variants × 3 sizes" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` = indigo accent w/ glow. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to fill container width. */
  block?: boolean;
  /** Icon element rendered before the label (e.g. a Lucide <svg>). */
  iconLeft?: React.ReactNode;
  /** Icon element rendered after the label. */
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;
