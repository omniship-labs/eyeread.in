import { logoMark } from '../assets.js';
import { Link } from '../router.jsx';

export default function Brand({ brand, size = 28, small = false }) {
  // Routes home from anywhere (e.g. the docs pages); on the home page the
  // router just scrolls back to the top.
  return (
    <Link className="brand" to="/">
      <img src={logoMark} alt={`${brand.name}${brand.tld}`} width={size} height={size} />
      <span className={`brand-word${small ? ' brand-word-sm' : ''}`}>
        {brand.name}
        <span>{brand.tld}</span>
      </span>
    </Link>
  );
}
