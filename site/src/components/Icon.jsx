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
  Languages,
  Code,
  Palette,
  FileText,
  Wrench,
} from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';
import githubIcon from '@iconify-icons/mdi/github';
import appleIcon from '@iconify-icons/mdi/apple';
import windowsIcon from '@iconify-icons/mdi/microsoft-windows';

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
  languages: Languages,
  code: Code,
  palette: Palette,
  'file-text': FileText,
  wrench: Wrench,
};

const BRAND = {
  github: githubIcon,
  apple: appleIcon,
  windows: windowsIcon,
};

export function Icon({ name, size = 24 }) {
  if (BRAND[name]) {
    return <IconifyIcon icon={BRAND[name]} width={size} height={size} aria-hidden="true" />;
  }
  const Lucide = LUCIDE[name];
  return Lucide ? <Lucide size={size} /> : null;
}

export default Icon;
