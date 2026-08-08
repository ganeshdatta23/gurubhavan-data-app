/** Strip to digits only. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export type PhoneIso2 = 'IN' | 'US' | 'AU' | string;

export type PhoneCheck = {
  ok: boolean;
  /** Normalized digits for storage when recoverable; otherwise original digits. */
  normalized: string;
  /** Expected shape for this country. */
  expected: string;
  /** Machine-readable status. */
  kind: string;
  /** User-facing validation message when not ok. */
  error?: string;
};

/**
 * Expected stored forms (digits only, no +):
 * - IN: 91 + 10-digit mobile (12) — national starts with 6–9
 * - US: 1 + 10-digit NANP (11) — area code starts with 2–9
 * - AU: 61 + 9-digit mobile (11) — national starts with 4 (no leading 0)
 */
export function expectedPhoneHint(iso2: string): string {
  switch (iso2.toUpperCase()) {
    case 'IN':
      return 'India (+91): 10-digit mobile. +91 added if missing.';
    case 'US':
      return 'USA (+1): 10-digit number, or 1 + 10 digits (11 total).';
    case 'AU':
      return 'Australia (+61): 04XXXXXXXX, or 61 + 9 digits starting with 4.';
    default:
      return 'Country code first, then mobile. Digits only, 7–15.';
  }
}

/** Normalize + validate mobile for a country. Safe to call on every save. */
export function normalizeAndCheckMobile(mobile: string, iso2: string): PhoneCheck {
  let d = digitsOnly(mobile);
  const cc = iso2.toUpperCase();

  if (!d) {
    return { ok: false, normalized: '', expected: expectedPhoneHint(cc), kind: 'EMPTY', error: 'Enter a mobile number.' };
  }

  if (d.startsWith('00')) d = d.slice(2);

  if (cc === 'IN') return checkIndia(d);
  if (cc === 'US') return checkUs(d);
  if (cc === 'AU') return checkAustralia(d);

  // Unknown country: keep digits, basic length only
  if (d.length < 7 || d.length > 15) {
    return {
      ok: false,
      normalized: d,
      expected: expectedPhoneHint(cc),
      kind: 'GENERIC_LEN',
      error: 'Enter a valid mobile number (7–15 digits).',
    };
  }
  return { ok: true, normalized: d, expected: expectedPhoneHint(cc), kind: 'GENERIC_OK' };
}

function checkIndia(d: string): PhoneCheck {
  const expected = '12 digits: 91 + 10-digit Indian mobile';

  // Full form
  if (d.startsWith('91') && d.length === 12) {
    const national = d.slice(2);
    if (!/^[6-9]\d{9}$/.test(national)) {
      return {
        ok: false,
        normalized: d,
        expected,
        kind: 'IN_BAD_NATIONAL',
        error: 'Indian mobile must be 10 digits starting with 6–9 after +91.',
      };
    }
    return { ok: true, normalized: d, expected, kind: 'IN_E164' };
  }

  // Trunk 0 + 10 national
  if (d.startsWith('0') && d.length === 11) {
    return checkIndia(d.slice(1));
  }

  // Bare 10-digit national
  if (d.length === 10 && /^[6-9]\d{9}$/.test(d)) {
    return { ok: true, normalized: `91${d}`, expected, kind: 'IN_E164' };
  }

  // Longer with 91 (typo extra digit)
  if (d.startsWith('91') && d.length > 12) {
    return {
      ok: false,
      normalized: d,
      expected,
      kind: 'IN_TOO_LONG',
      error: `Indian number has ${d.length} digits; expected 12 (91 + 10-digit mobile).`,
    };
  }

  // Incomplete with or without 91
  if (d.startsWith('91')) {
    return {
      ok: false,
      normalized: d,
      expected,
      kind: 'IN_INCOMPLETE',
      error: `Indian number incomplete (${d.length} digits). Need 91 + 10-digit mobile (12 total).`,
    };
  }

  return {
    ok: false,
    normalized: d,
    expected,
    kind: 'IN_INVALID',
    error: `Indian number must be 10 digits (or 12 with 91). Got ${d.length} digits.`,
  };
}

function checkUs(d: string): PhoneCheck {
  const expected = '11 digits: 1 + 10-digit US number';

  if (d.startsWith('1') && d.length === 11) {
    const national = d.slice(1);
    // NANP: NXX-NXX-XXXX with N = 2–9 for area and exchange
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
      return {
        ok: false,
        normalized: d,
        expected,
        kind: 'US_BAD_NANP',
        error: 'US number format looks invalid after country code +1.',
      };
    }
    return { ok: true, normalized: d, expected, kind: 'US_E164' };
  }

  if (d.length === 10 && /^[2-9]\d{9}$/.test(d)) {
    const withCc = `1${d}`;
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) {
      return {
        ok: false,
        normalized: withCc,
        expected,
        kind: 'US_BAD_NANP',
        error: 'US number format looks invalid.',
      };
    }
    return { ok: true, normalized: withCc, expected, kind: 'US_E164' };
  }

  return {
    ok: false,
    normalized: d,
    expected,
    kind: 'US_INVALID',
    error: `US number must be 10 digits or 11 with leading 1. Got ${d.length} digits.`,
  };
}

function checkAustralia(d: string): PhoneCheck {
  const expected = '11 digits: 61 + 9-digit mobile (starts with 4)';

  // Intl mobile: 61 4XX XXX XXX
  if (d.startsWith('61') && d.length === 11) {
    const national = d.slice(2);
    if (!/^4\d{8}$/.test(national)) {
      return {
        ok: false,
        normalized: d,
        expected,
        kind: 'AU_BAD_MOBILE',
        error: 'Australian mobile after +61 must be 9 digits starting with 4.',
      };
    }
    return { ok: true, normalized: d, expected, kind: 'AU_E164' };
  }

  // Local 04XXXXXXXX
  if (d.startsWith('04') && d.length === 10) {
    return { ok: true, normalized: `61${d.slice(1)}`, expected, kind: 'AU_E164' };
  }

  // 9-digit mobile without 0/61
  if (d.length === 9 && /^4\d{8}$/.test(d)) {
    return { ok: true, normalized: `61${d}`, expected, kind: 'AU_E164' };
  }

  return {
    ok: false,
    normalized: d,
    expected,
    kind: 'AU_INVALID',
    error: `Australian mobile must be 04XXXXXXXX (10) or 61 + 9 digits (11). Got ${d.length} digits.`,
  };
}

/** @deprecated Prefer normalizeAndCheckMobile — kept for call sites that only need India. */
export function ensureIndiaCountryCode(mobile: string): string {
  return normalizeAndCheckMobile(mobile, 'IN').normalized;
}

/** Variants used for duplicate detection (with/without country code). */
export function mobileMatchVariants(mobile: string): string[] {
  const d = digitsOnly(mobile);
  if (!d) return [];
  const variants = new Set<string>([d]);

  if (d.startsWith('91') && d.length >= 12) {
    variants.add(d.slice(2));
  } else if (d.startsWith('1') && d.length === 11) {
    variants.add(d.slice(1));
  } else if (d.startsWith('61') && d.length === 11) {
    variants.add(d.slice(2));
    variants.add(`0${d.slice(2)}`);
  } else if (d.length === 10) {
    variants.add(`91${d}`);
    variants.add(`1${d}`);
    if (d.startsWith('04')) variants.add(`61${d.slice(1)}`);
  } else if (d.startsWith('0') && d.length === 11) {
    const national = d.slice(1);
    variants.add(national);
    variants.add(`91${national}`);
  } else if (d.startsWith('91') && d.length > 2 && d.length < 12) {
    variants.add(d.slice(2));
  }

  return [...variants];
}

/** Human-readable mobile with country-style formatting. */
export function formatMobileDisplay(mobile: string): string {
  const d = digitsOnly(mobile);
  if (!d) return mobile;

  if (d.startsWith('91') && d.length === 12) {
    const national = d.slice(2);
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  if (d.startsWith('91') && d.length > 2) {
    return `+91 ${d.slice(2)}`;
  }
  if (d.startsWith('1') && d.length === 11) {
    const n = d.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (d.startsWith('61') && d.length === 11) {
    const n = d.slice(2);
    return `+61 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }
  if (d.length >= 11 && (d.startsWith('1') || d.startsWith('61'))) {
    return `+${d}`;
  }
  return mobile;
}

/** tel: href — prefer + for reliable dialing. */
export function telHref(mobile: string): string {
  const d = digitsOnly(mobile);
  if (!d) return `tel:${mobile}`;
  return `tel:+${d}`;
}
