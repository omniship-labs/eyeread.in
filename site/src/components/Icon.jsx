/* One <Icon name="..." /> entry point so config stays framework-agnostic
   (it just names icons as strings).
   - Generic UI icons: lucide-react (bundled).
   - Brand marks (GitHub, Apple): lucide dropped brand icons, so these come
     from the Iconify CDN via the <iconify-icon> web component (loaded in
     index.html). It renders inline SVG, so currentColor still applies. */
import {
  EyeOff,
  Mic,
  Aperture,
  Check,
  Info,
  Heart,
  Star,
  ChevronsLeftRight,
  ArrowRight,
} from 'lucide-react';

const LUCIDE = {
  'eye-off': EyeOff,
  mic: Mic,
  aperture: Aperture,
  check: Check,
  info: Info,
  heart: Heart,
  star: Star,
  chevrons: ChevronsLeftRight,
  arrow: ArrowRight,
};

// Brand marks served from the Iconify CDN (Material Design Icons set).
const BRAND = {
  github: 'mdi:github',
  apple: 'mdi:apple',
};

export function Icon({ name, size = 24 }) {
  if (BRAND[name]) {
    return <iconify-icon icon={BRAND[name]} width={size} height={size} aria-hidden="true" />;
  }
  const Lucide = LUCIDE[name];
  return Lucide ? <Lucide size={size} /> : null;
}

export default Icon;
