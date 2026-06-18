import * as React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  /** Optional inline label to the right of the track. */
  label?: string;
}

/** On/off toggle with an indigo "on" state. Used for settings like Mirror, Hide from screen-share. */
export declare function Switch(props: SwitchProps): JSX.Element;
