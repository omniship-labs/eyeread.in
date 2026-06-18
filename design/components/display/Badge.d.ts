import * as React from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'record' | 'success' | 'warning';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Leading status dot. On `record` it pulses. */
  dot?: boolean;
  /** Sentence-case sans styling instead of mono uppercase. */
  solid?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Compact status pill — Live, REC, Synced, Draft. Mono uppercase by default. */
export declare function Badge(props: BadgeProps): JSX.Element;
