import { db } from '@/db';
import { countries, states, cities, sourceGroups } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getCountries() {
  return db.select({ id: countries.id, name: countries.name }).from(countries).orderBy(countries.name);
}

export async function getStatesByCountry(countryId: number) {
  return db
    .select({ id: states.id, name: states.name })
    .from(states)
    .where(eq(states.countryId, countryId))
    .orderBy(states.name);
}

export async function getStates() {
  return db.select({ id: states.id, name: states.name, countryId: states.countryId }).from(states).orderBy(states.name);
}

export async function getCitiesByState(stateId: number) {
  return db
    .select({ id: cities.id, name: cities.name })
    .from(cities)
    .where(eq(cities.stateId, stateId))
    .orderBy(cities.name);
}

export async function getSourceGroups() {
  return db.select({ id: sourceGroups.id, name: sourceGroups.name }).from(sourceGroups).orderBy(sourceGroups.name);
}
