import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cities, countries, states } from '@/db/schema';

export function getCountries() {
  return db.select({ id: countries.id, name: countries.name, iso2: countries.iso2 }).from(countries).orderBy(countries.name);
}

export function getStatesByCountry(countryId: number) {
  return db.select({ id: states.id, name: states.name }).from(states).where(eq(states.countryId, countryId)).orderBy(states.name);
}

export function getCitiesByState(stateId: number) {
  return db.select({ id: cities.id, name: cities.name }).from(cities).where(eq(cities.stateId, stateId)).orderBy(cities.name);
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

/** Case-insensitive country match by display name. */
export async function findCountryByName(name: string) {
  const normalized = normalizeName(name).toLowerCase();
  const [row] = await db
    .select({ id: countries.id, name: countries.name, iso2: countries.iso2 })
    .from(countries)
    .where(sql`lower(${countries.name}) = ${normalized}`)
    .limit(1);
  return row ?? null;
}

/** Case-insensitive state match within a country. */
export async function findStateByName(countryId: number, name: string) {
  const normalized = normalizeName(name).toLowerCase();
  const [row] = await db
    .select({ id: states.id, name: states.name, countryId: states.countryId })
    .from(states)
    .where(and(eq(states.countryId, countryId), sql`lower(${states.name}) = ${normalized}`))
    .limit(1);
  return row ?? null;
}

/** Case-insensitive city match within a state. */
export async function findCityByName(stateId: number, name: string) {
  const normalized = normalizeName(name).toLowerCase();
  const [row] = await db
    .select({ id: cities.id, name: cities.name, stateId: cities.stateId })
    .from(cities)
    .where(and(eq(cities.stateId, stateId), sql`lower(${cities.name}) = ${normalized}`))
    .limit(1);
  return row ?? null;
}

async function allocateIso2(name: string): Promise<string> {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const candidates: string[] = [];
  if (letters.length >= 2) candidates.push(letters.slice(0, 2));
  if (letters.length >= 3) candidates.push(letters.slice(0, 3));
  if (letters.length >= 1) {
    for (let i = 0; i < 100; i += 1) {
      candidates.push(`${letters[0]}${i}`);
    }
  }
  for (let i = 0; i < 1000; i += 1) {
    candidates.push(`X${i}`);
  }

  for (const iso2 of candidates) {
    const [existing] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(sql`upper(${countries.iso2}) = ${iso2.toUpperCase()}`)
      .limit(1);
    if (!existing) return iso2.slice(0, 8);
  }
  return `X${Date.now().toString(36).toUpperCase()}`.slice(0, 8);
}

export type CreateLookupResult =
  | { ok: true; id: number; name: string; iso2?: string }
  | { ok: false; error: string; status: 400 | 404 | 409; existingId?: number };

export async function createCountry(rawName: string): Promise<CreateLookupResult> {
  const name = normalizeName(rawName);
  if (name.length < 2) return { ok: false, error: 'Enter a country name (at least 2 characters).', status: 400 };
  if (name.length > 100) return { ok: false, error: 'Country name is too long (100 characters max).', status: 400 };

  const existing = await findCountryByName(name);
  if (existing) {
    return {
      ok: false,
      error: `"${existing.name}" already exists. Select it from the country list.`,
      status: 409,
      existingId: existing.id,
    };
  }

  const iso2 = await allocateIso2(name);
  try {
    const [created] = await db
      .insert(countries)
      .values({ name, iso2, phoneCode: '+0' })
      .returning({ id: countries.id, name: countries.name, iso2: countries.iso2 });
    return { ok: true, id: created.id, name: created.name, iso2: created.iso2 };
  } catch {
    const race = await findCountryByName(name);
    if (race) {
      return {
        ok: false,
        error: `"${race.name}" already exists. Select it from the country list.`,
        status: 409,
        existingId: race.id,
      };
    }
    return { ok: false, error: 'Could not add this country. Try again.', status: 400 };
  }
}

export async function createState(countryId: number, rawName: string): Promise<CreateLookupResult> {
  const name = normalizeName(rawName);
  if (!Number.isInteger(countryId) || countryId < 1) {
    return { ok: false, error: 'Select a country first.', status: 400 };
  }
  if (name.length < 2) return { ok: false, error: 'Enter a state name (at least 2 characters).', status: 400 };
  if (name.length > 100) return { ok: false, error: 'State name is too long (100 characters max).', status: 400 };

  const [country] = await db.select({ id: countries.id }).from(countries).where(eq(countries.id, countryId)).limit(1);
  if (!country) return { ok: false, error: 'That country was not found. Choose a valid country.', status: 404 };

  const existing = await findStateByName(countryId, name);
  if (existing) {
    return {
      ok: false,
      error: `"${existing.name}" already exists for this country. Select it from the state list.`,
      status: 409,
      existingId: existing.id,
    };
  }

  try {
    const [created] = await db
      .insert(states)
      .values({ countryId, name })
      .returning({ id: states.id, name: states.name });
    return { ok: true, id: created.id, name: created.name };
  } catch {
    // Unique index race: re-check and surface a clear duplicate error.
    const race = await findStateByName(countryId, name);
    if (race) {
      return {
        ok: false,
        error: `"${race.name}" already exists for this country. Select it from the state list.`,
        status: 409,
        existingId: race.id,
      };
    }
    return { ok: false, error: 'Could not add this state. Try again.', status: 400 };
  }
}

export async function createCity(stateId: number, rawName: string): Promise<CreateLookupResult> {
  const name = normalizeName(rawName);
  if (!Number.isInteger(stateId) || stateId < 1) {
    return { ok: false, error: 'Select a state first.', status: 400 };
  }
  if (name.length < 2) return { ok: false, error: 'Enter a city name (at least 2 characters).', status: 400 };
  if (name.length > 100) return { ok: false, error: 'City name is too long (100 characters max).', status: 400 };

  const [state] = await db.select({ id: states.id }).from(states).where(eq(states.id, stateId)).limit(1);
  if (!state) return { ok: false, error: 'That state was not found. Choose a valid state.', status: 404 };

  const existing = await findCityByName(stateId, name);
  if (existing) {
    return {
      ok: false,
      error: `"${existing.name}" already exists for this state. Select it from the city list.`,
      status: 409,
      existingId: existing.id,
    };
  }

  try {
    const [created] = await db
      .insert(cities)
      .values({ stateId, name })
      .returning({ id: cities.id, name: cities.name });
    return { ok: true, id: created.id, name: created.name };
  } catch {
    const race = await findCityByName(stateId, name);
    if (race) {
      return {
        ok: false,
        error: `"${race.name}" already exists for this state. Select it from the city list.`,
        status: 409,
        existingId: race.id,
      };
    }
    return { ok: false, error: 'Could not add this city. Try again.', status: 400 };
  }
}
