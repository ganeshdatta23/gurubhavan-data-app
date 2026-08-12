import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cities, countries, devotees, states } from '@/db/schema';

export type AnalyticsFilters = {
  countryId?: number;
  stateId?: number;
  cityId?: number;
};

function activeWhere(filters: AnalyticsFilters) {
  const conditions = [isNull(devotees.deletedAt)];
  if (filters.countryId) conditions.push(eq(devotees.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(devotees.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(devotees.cityId, filters.cityId));
  return and(...conditions)!;
}

function numeric(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function getAnalyticsOverview(filters: AnalyticsFilters = {}, days = 30) {
  const where = activeWhere(filters);
  const trendStart = Math.floor(Date.now() / 1000) - (days - 1) * 24 * 60 * 60;
  const trendDate = sql<string>`date(${devotees.createdAt}, 'unixepoch')`;

  const [summary, countriesByCount, statesByCount, citiesByCount, trend] = await Promise.all([
    db.select({
      total: count(),
      countries: sql<number>`count(distinct ${devotees.countryId})`,
      states: sql<number>`count(distinct ${devotees.stateId})`,
      cities: sql<number>`count(distinct ${devotees.cityId})`,
      addedRecently: sql<number>`sum(case when ${devotees.createdAt} >= unixepoch('now', '-30 days') then 1 else 0 end)`,
      requiredComplete: sql<number>`sum(case when length(trim(${devotees.fullName})) > 0 and length(trim(${devotees.mobile})) > 0 and length(trim(${devotees.address})) > 0 then 1 else 0 end)`,
      emailComplete: sql<number>`sum(case when length(trim(coalesce(${devotees.email}, ''))) > 0 then 1 else 0 end)`,
      postalComplete: sql<number>`sum(case when upper(${countries.iso2}) != 'IN' or length(trim(coalesce(${devotees.postalCode}, ''))) = 6 then 1 else 0 end)`,
    })
      .from(devotees)
      .innerJoin(countries, eq(devotees.countryId, countries.id))
      .where(where),
    db.select({ id: countries.id, name: countries.name, count: count() })
      .from(devotees)
      .innerJoin(countries, eq(devotees.countryId, countries.id))
      .where(where)
      .groupBy(countries.id, countries.name)
      .orderBy(sql`count(*) desc`, asc(countries.name)),
    db.select({ id: states.id, name: states.name, countryName: countries.name, count: count() })
      .from(devotees)
      .innerJoin(states, eq(devotees.stateId, states.id))
      .innerJoin(countries, eq(devotees.countryId, countries.id))
      .where(where)
      .groupBy(states.id, states.name, countries.name)
      .orderBy(sql`count(*) desc`, asc(states.name)),
    db.select({ id: cities.id, name: cities.name, stateName: states.name, countryName: countries.name, count: count() })
      .from(devotees)
      .innerJoin(cities, eq(devotees.cityId, cities.id))
      .innerJoin(states, eq(devotees.stateId, states.id))
      .innerJoin(countries, eq(devotees.countryId, countries.id))
      .where(where)
      .groupBy(cities.id, cities.name, states.name, countries.name)
      .orderBy(sql`count(*) desc`, asc(cities.name)),
    db.select({ date: trendDate, count: count() })
      .from(devotees)
      .where(and(where, sql`${devotees.createdAt} >= ${trendStart}`))
      .groupBy(trendDate)
      .orderBy(asc(trendDate)),
  ]);

  const values = summary[0];
  const total = numeric(values?.total);
  const requiredComplete = numeric(values?.requiredComplete);
  const emailComplete = numeric(values?.emailComplete);
  const postalComplete = numeric(values?.postalComplete);

  return {
    summary: {
      total,
      countries: numeric(values?.countries),
      states: numeric(values?.states),
      cities: numeric(values?.cities),
      addedRecently: numeric(values?.addedRecently),
      requiredCompleteness: total ? Math.round((requiredComplete / total) * 100) : 0,
      emailCompleteness: total ? Math.round((emailComplete / total) * 100) : 0,
      postalCompleteness: total ? Math.round((postalComplete / total) * 100) : 0,
    },
    countries: countriesByCount.map((row) => ({ ...row, count: numeric(row.count) })),
    states: statesByCount.map((row) => ({ ...row, count: numeric(row.count) })),
    cities: citiesByCount.map((row) => ({ ...row, count: numeric(row.count) })),
    trend: trend.map((row) => ({ date: row.date, count: numeric(row.count) })),
  };
}
