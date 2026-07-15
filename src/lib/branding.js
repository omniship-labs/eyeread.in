import logoMarkDark from '../assets/logos/eyeread-mark-bounded-dark.svg';
import logoMarkLight from '../assets/logos/eyeread-mark-bounded-light.svg';
import logoMarkDarkGlimpse from '../assets/logos/eyeread-mark-bounded-dark-glimpse.svg';
import logoMarkLightGlimpse from '../assets/logos/eyeread-mark-bounded-light-glimpse.svg';
import { isGlimpse } from './channel';

export const LOGO_MARK_DARK = isGlimpse ? logoMarkDarkGlimpse : logoMarkDark;
export const LOGO_MARK_LIGHT = isGlimpse ? logoMarkLightGlimpse : logoMarkLight;
