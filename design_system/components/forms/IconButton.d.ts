import * as React from 'react';

export type IconButtonVariant = 'ghost' | 'solid' | 'accent';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Toggled/selected state (indigo tint). */
  active?: boolean;
  /** Accessible label — also used as the tooltip title. */
  label: string;
  /** The icon SVG (Lucide). */
  children: React.ReactNode;
}

/** Square icon-only button for toolbars and overlay controls. */
export declare function IconButton(props: IconButtonProps): JSX.Element;
