import { logoMark } from '../assets.js';

export default function Brand({ brand, size = 28, small = false }) {
  return (
    <a className="brand" href="#top">
      <img src={logoMark} alt={`${brand.name}${brand.tld}`} width={size} height={size} />
      <span className={`brand-word${small ? ' brand-word-sm' : ''}`}>
        {brand.name}
        <span>{brand.tld}</span>
      </span>
    </a>
  );
}
