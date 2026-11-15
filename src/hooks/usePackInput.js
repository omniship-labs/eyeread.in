import { useEffect } from 'react';
import { startPackInput } from '../lib/packInput';

/** Report this window's keyboard and mouse input to packs that asked for it. */
export function usePackInput() {
  useEffect(() => startPackInput(), []);
}
