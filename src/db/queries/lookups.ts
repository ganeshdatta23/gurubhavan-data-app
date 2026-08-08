import { eq } from 'drizzle-orm';
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
