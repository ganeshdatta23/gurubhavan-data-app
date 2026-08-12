import { and, asc, count, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cities, countries, devotees, states } from '@/db/schema';
import type { DevoteeQuery } from '@/lib/validators';

export function devoteeWhere(filters: Pick<DevoteeQuery, 'q' | 'countryId' | 'stateId' | 'cityId'>) {
  const conditions = [isNull(devotees.deletedAt)];
  if (filters.q) {
    // Case-insensitive name match. Escape LIKE wildcards so user input is literal.
    const escaped = filters.q.replace(/[%_\\]/g, '\\$&');
    const nameMatch = sql`lower(${devotees.fullName}) like ${`%${escaped.toLowerCase()}%`} escape '\\'`;
    // Only search mobile when the query has digits. A pure name like "Ram" would
    // otherwise become mobile LIKE '%%' and match every row (search appears broken).
    const digits = filters.q.replace(/\D/g, '');
    if (digits) {
      conditions.push(or(nameMatch, like(devotees.mobile, `%${digits}%`))!);
    } else {
      conditions.push(nameMatch);
    }
  }
  if (filters.countryId) conditions.push(eq(devotees.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(devotees.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(devotees.cityId, filters.cityId));
  return and(...conditions)!;
}

const selection = {
  id: devotees.id,
  fullName: devotees.fullName,
  mobile: devotees.mobile,
  email: devotees.email,
  address: devotees.address,
  postalCode: devotees.postalCode,
  countryId: devotees.countryId,
  stateId: devotees.stateId,
  cityId: devotees.cityId,
  countryName: countries.name,
  stateName: states.name,
  cityName: cities.name,
};

export async function listDevotees(query: DevoteeQuery) {
  const where = devoteeWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const [rows, totalResult] = await Promise.all([
    db.select(selection)
      .from(devotees)
      .innerJoin(cities, eq(devotees.cityId, cities.id))
      .innerJoin(states, eq(devotees.stateId, states.id))
      .innerJoin(countries, eq(devotees.countryId, countries.id))
      .where(where)
      .orderBy(asc(cities.name), asc(devotees.fullName))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(devotees).where(where),
  ]);
  return { rows, total: totalResult[0]?.value ?? 0 };
}

export function listDevoteesForExport(filters: Pick<DevoteeQuery, 'q' | 'countryId' | 'stateId' | 'cityId'>) {
  return db.select(selection)
    .from(devotees)
    .innerJoin(cities, eq(devotees.cityId, cities.id))
    .innerJoin(states, eq(devotees.stateId, states.id))
    .innerJoin(countries, eq(devotees.countryId, countries.id))
    .where(devoteeWhere(filters))
    .orderBy(asc(cities.name), asc(devotees.fullName));
}

/** Name + mobile + country code for the people a message is being sent to. */
export function listDevoteesForMessaging(ids: number[]) {
  return db.select({
    id: devotees.id,
    fullName: devotees.fullName,
    mobile: devotees.mobile,
    iso2: countries.iso2,
  })
    .from(devotees)
    .innerJoin(countries, eq(devotees.countryId, countries.id))
    .where(and(inArray(devotees.id, ids), isNull(devotees.deletedAt)));
}

export async function listDevoteeIds(filters: Pick<DevoteeQuery, 'q' | 'countryId' | 'stateId' | 'cityId'>) {
  const rows = await db.select({ id: devotees.id })
    .from(devotees)
    .where(devoteeWhere(filters))
    .orderBy(asc(devotees.id));
  return rows.map((row) => row.id);
}

export async function getDevoteeById(id: number) {
  const [row] = await db.select(selection)
    .from(devotees)
    .innerJoin(cities, eq(devotees.cityId, cities.id))
    .innerJoin(states, eq(devotees.stateId, states.id))
    .innerJoin(countries, eq(devotees.countryId, countries.id))
    .where(and(eq(devotees.id, id), isNull(devotees.deletedAt)))
    .limit(1);
  return row ?? null;
}
