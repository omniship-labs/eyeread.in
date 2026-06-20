import * as React from 'react';

/**
 * The teleprompter reading panel — dims spoken words, glows the active word, keeps upcoming readable.
 * Drive `active` from the voice-detection word index.
 */
export interface ScriptViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The script text. Split on whitespace into words. */
  text: string;
  /** Index of the current word (0-based). Words before dim, this one glows, after are mid-opacity. */
  active?: number;
  /** Reading size preset or explicit pixel size. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Flip horizontally for beam-splitter / mirror-glass rigs. */
  mirror?: boolean;
  align?: 'left' | 'center';
}

export declare function ScriptViewer(props: ScriptViewerProps): JSX.Element;
