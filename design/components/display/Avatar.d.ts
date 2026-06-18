import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. Falls back to initials from `name`. */
  src?: string;
  /** Full name — used for initials + alt text. */
  name?: string;
  /** Preset size or explicit pixel number. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Indigo-tinted initials fallback. */
  accent?: boolean;
  /** Corner status dot. */
  status?: 'online' | 'live';
}

/** Round user avatar with image or initials fallback and optional status dot. */
export declare function Avatar(props: AvatarProps): JSX.Element;
