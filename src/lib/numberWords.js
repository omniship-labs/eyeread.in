/**
 * Digit → spoken-word expansion for voice matching (English).
 *
 * Speech engines format spoken numbers as digits ("fourteen thousand" →
 * "14,000"), which can never match script words letter-for-letter, so the
 * pointer stalls on every number until plain words re-anchor it. Expanding
 * digit tokens back into the words the speaker actually said lets the
 * matcher align them with scripts written the way people speak.
 */

// prettier-ignore
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
// prettier-ignore
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
  'eighty', 'ninety',
];
const SCALES = [
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
  [100, 'hundred'],
];

function intToWords(n, out) {
  if (n < 20) {
    out.push(ONES[n]);
    return;
  }
  if (n < 100) {
    out.push(TENS[Math.floor(n / 10)]);
    if (n % 10) out.push(ONES[n % 10]);
    return;
  }
  for (const [scale, name] of SCALES) {
    if (n >= scale) {
      intToWords(Math.floor(n / scale), out);
      out.push(name);
      if (n % scale) intToWords(n % scale, out);
      return;
    }
  }
}

/**
 * Expand one recognizer token into the spoken words it stands for, or null
 * when the token isn't numeric. Handles "92", "14,000", "1.4", "92%", "$40"
 * and clock times ("10:30"). Trailing sentence punctuation is ignored.
 */
export function expandNumberToken(raw) {
  const t = raw.replace(/[,.;:!?]+$/, '');

  const time = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (time && +time[1] <= 24 && +time[2] <= 59) {
    const out = [];
    intToWords(+time[1], out);
    const mm = +time[2];
    if (mm > 0) {
      if (mm < 10) out.push('oh');
      intToWords(mm, out);
    }
    return out;
  }

  const m = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?%?$/.exec(t);
  if (!m) return null;
  const int = Number(m[1].replace(/,/g, ''));
  if (!Number.isSafeInteger(int) || int >= 1e12) return null;

  const out = [];
  intToWords(int, out);
  if (m[2] !== undefined) {
    out.push('point');
    for (const d of m[2]) out.push(ONES[+d]);
  }
  if (t.endsWith('%')) out.push('percent');
  if (t.startsWith('$')) out.push(int === 1 && m[2] === undefined ? 'dollar' : 'dollars');
  return out;
}
