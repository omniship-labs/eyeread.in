/* One <Icon name="..." /> entry point so config stays framework-agnostic
   (it just names icons as strings).
   - Generic UI icons: lucide-react.
   - Brand marks (GitHub, Apple): lucide ships none, so these come from
     Iconify's Material Design Icons — imported per-icon and bundled at build
     time (offline, tree-shaken to just these two, no runtime CDN). They render
     as inline SVG, so currentColor still applies. */
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
  Globe,
} from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';
import githubIcon from '@iconify-icons/mdi/github';
import appleIcon from '@iconify-icons/mdi/apple';

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
  globe: Globe,
};

const BRAND = {
  github: githubIcon,
  apple: appleIcon,
};

export function Icon({ name, size = 24 }) {
  if (BRAND[name]) {
    return <IconifyIcon icon={BRAND[name]} width={size} height={size} aria-hidden="true" />;
  }
  const Lucide = LUCIDE[name];
  return Lucide ? <Lucide size={size} /> : null;
}

export default Icon;
