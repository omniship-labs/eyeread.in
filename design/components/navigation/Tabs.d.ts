import * as React from 'react';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional count chip on the right of the tab. */
  count?: number;
}

export interface TabsProps {
  items: Array<string | TabItem>;
  value: string;
  onChange?: (value: string) => void;
  /** `line` underline tabs (default) or `pill` segmented tabs. */
  variant?: 'line' | 'pill';
  className?: string;
}

/** Tab navigation — underline or pill style. Used for app sections (Scripts / Recordings / Settings). */
export declare function Tabs(props: TabsProps): JSX.Element;
