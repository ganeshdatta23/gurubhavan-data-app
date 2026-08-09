import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import { cities, countries, devotees, states } from '@/db/schema';
import { mobileMatchVariants, normalizeAndCheckMobile } from '@/lib/phone';
import type { DevoteeFormData } from '@/lib/validators';

export async function validateLocation(data: DevoteeFormData): Promise<string | null> {
  const [[country], [state], [city]] = await Promise.all([
    db.select({ id: countries.id, iso2: countries.iso2 }).from(countries).where(eq(countries.id, data.countryId)).limit(1),
    db.select({ id: states.id, countryId: states.countryId }).from(states).where(eq(states.id, data.stateId)).limit(1),
    db.select({ id: cities.id, stateId: cities.stateId }).from(cities).where(eq(cities.id, data.cityId)).limit(1),
  ]);
  if (!country || !state || !city || state.countryId !== country.id || city.stateId !== state.id) {
    return 'Choose a valid country, state, and city.';
  }
  if (country.iso2.toUpperCase() === 'IN' && !/^\d{6}$/.test(data.postalCode ?? '')) {
    return 'Enter a 6-digit PIN code for India.';
  }
  return null;
}

/**
 * Normalize mobile for the devotee's country and enforce digit-count rules.
 * Returns { mobile } or { error }.
 */
export async function normalizeDevoteeMobile(
  data: DevoteeFormData,
): Promise<{ mobile: string } | { error: string }> {
  const [country] = await db
    .select({ iso2: countries.iso2 })
    .from(countries)
    .where(eq(countries.id, data.countryId))
    .limit(1);

  if (!country) return { error: 'Choose a valid country.' };

  const check = normalizeAndCheckMobile(data.mobile, country.iso2);
  if (!check.ok) {
    return { error: check.error || `Invalid mobile for ${country.iso2}. ${check.expected}` };
  }
  return { mobile: check.normalized };
}

export async function findActiveDuplicate(mobile: string, countryId: number, excludeId?: number) {
  const variants = mobileMatchVariants(mobile);
  if (!variants.length) return null;

  // Variants are retained for older rows, but country scoping prevents a US
  // number and an Indian number with the same national digits from colliding.
  const conditions = [eq(devotees.countryId, countryId), inArray(devotees.mobile, variants), isNull(devotees.deletedAt)];
  if (excludeId) conditions.push(ne(devotees.id, excludeId));
  const [row] = await db.select({ id: devotees.id, fullName: devotees.fullName })
    .from(devotees)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}
