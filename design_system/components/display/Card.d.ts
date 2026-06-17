import * as React from 'react';

export type CardVariant = 'default' | 'raised' | 'glass' | 'accent';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `glass` is the translucent overlay material; `accent` adds the indigo glow. */
  variant?: CardVariant;
  padding?: CardPadding;
  /** Adds hover lift + pointer cursor. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/** Surface container. The `glass` variant is the signature translucent overlay panel. */
export declare function Card(props: CardProps): JSX.Element;
