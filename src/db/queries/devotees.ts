import { db } from '@/db';
import {
  devotees,
  devoteePhones,
  reviewFlags,
  cities,
  states,
  countries,
  sourceGroups,
} from '@/db/schema';
import { and, eq, like, isNull, isNotNull, ne, inArray, asc, desc, count, sql } from 'drizzle-orm';
import type { DevoteeQuery } from '@/lib/validators/index';

function buildWhere(filters: Omit<DevoteeQuery, 'page' | 'limit' | 'sort'>) {
  const conditions = [isNull(devotees.deletedAt)];

  if (filters.q) {
    conditions.push(like(devotees.fullName, `%${filters.q}%`));
  }
  if (filters.status) conditions.push(eq(devotees.recordStatus, filters.status));
  if (filters.countryId) conditions.push(eq(devotees.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(devotees.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(devotees.cityId, filters.cityId));
  if (filters.sourceGroupId) conditions.push(eq(devotees.sourceGroupId, filters.sourceGroupId));
  if (filters.whatsappOptedIn === true) conditions.push(eq(devotees.whatsappOptedOut, false));
  if (filters.whatsappOptedIn === false) conditions.push(eq(devotees.whatsappOptedOut, true));

  return and(...conditions);
}

const baseSelect = {
  id: devotees.id,
  fullName: devotees.fullName,
  recordStatus: devotees.recordStatus,
  whatsappOptedOut: devotees.whatsappOptedOut,
  sourceGroupId: devotees.sourceGroupId,
  sourceGroupName: sourceGroups.name,
  cityId: devotees.cityId,
  cityName: cities.name,
  stateId: devotees.stateId,
  stateName: states.name,
  countryId: devotees.countryId,
  countryName: countries.name,
  addressLine1: devotees.addressLine1,
  addressLine2: devotees.addressLine2,
  addressLine3: devotees.addressLine3,
  postalCode: devotees.postalCode,
  notes: devotees.notes,
  createdAt: devotees.createdAt,
  updatedAt: devotees.updatedAt,
};

function baseJoins(query: ReturnType<typeof db.select>) {
  return (query as ReturnType<typeof db.select>)
    .from(devotees)
    .leftJoin(cities, eq(devotees.cityId, cities.id))
    .leftJoin(states, eq(devotees.stateId, states.id))
    .leftJoin(countries, eq(devotees.countryId, countries.id))
    .leftJoin(sourceGroups, eq(devotees.sourceGroupId, sourceGroups.id));
}

export async function listDevotees(query: DevoteeQuery) {
  const { page, limit, sort, ...filters } = query;
  const where = buildWhere(filters);
  const offset = (page - 1) * limit;

  const orderBy =
    sort === 'name_desc' ? desc(devotees.fullName)
    : sort === 'created_desc' ? desc(devotees.createdAt)
    : sort === 'status' ? asc(devotees.recordStatus)
    : asc(devotees.fullName);

  const [rows, [{ total }]] = await Promise.all([
    db.select(baseSelect).from(devotees)
      .leftJoin(cities, eq(devotees.cityId, cities.id))
      .leftJoin(states, eq(devotees.stateId, states.id))
      .leftJoin(countries, eq(devotees.countryId, countries.id))
      .leftJoin(sourceGroups, eq(devotees.sourceGroupId, sourceGroups.id))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(devotees).where(where),
  ]);

  // Attach primary phone + flags
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { rows: [], total: 0 };

  const [phones, flags] = await Promise.all([
    db
      .select({ devoteeId: devoteePhones.devoteeId, phoneNumber: devoteePhones.phoneNumber, isPrimary: devoteePhones.isPrimary })
      .from(devoteePhones)
      .where(inArray(devoteePhones.devoteeId, ids)),
    db
      .select({ devoteeId: reviewFlags.devoteeId, flag: reviewFlags.flag })
      .from(reviewFlags)
      .where(and(inArray(reviewFlags.devoteeId, ids), isNull(reviewFlags.resolvedAt))),
  ]);

  const phoneMap = new Map<number, string>();
  for (const p of phones) {
    if (p.isPrimary) phoneMap.set(p.devoteeId, p.phoneNumber);
  }
  const flagMap = new Map<number, string[]>();
  for (const f of flags) {
    const arr = flagMap.get(f.devoteeId) ?? [];
    arr.push(f.flag);
    flagMap.set(f.devoteeId, arr);
  }

  const enriched = rows.map((r) => ({
    ...r,
    primaryPhone: phoneMap.get(r.id) ?? null,
    flags: flagMap.get(r.id) ?? [],
  }));

  return { rows: enriched, total };
}

export async function getDevoteeIds(filters: Omit<DevoteeQuery, 'page' | 'limit' | 'sort'>) {
  const where = buildWhere(filters);
  const rows = await db.select({ id: devotees.id }).from(devotees).where(where);
  return rows.map((r) => r.id);
}

export async function getDevoteeById(id: number) {
  const [row] = await db
    .select(baseSelect)
    .from(devotees)
    .leftJoin(cities, eq(devotees.cityId, cities.id))
    .leftJoin(states, eq(devotees.stateId, states.id))
    .leftJoin(countries, eq(devotees.countryId, countries.id))
    .leftJoin(sourceGroups, eq(devotees.sourceGroupId, sourceGroups.id))
    .where(and(eq(devotees.id, id), isNull(devotees.deletedAt)))
    .limit(1);

  if (!row) return null;

  const [phones, flags] = await Promise.all([
    db
      .select({ id: devoteePhones.id, phoneNumber: devoteePhones.phoneNumber, isPrimary: devoteePhones.isPrimary, countryCode: devoteePhones.countryCode })
      .from(devoteePhones)
      .where(eq(devoteePhones.devoteeId, id)),
    db
      .select({ id: reviewFlags.id, flag: reviewFlags.flag, resolvedAt: reviewFlags.resolvedAt })
      .from(reviewFlags)
      .where(eq(reviewFlags.devoteeId, id)),
  ]);

  return { ...row, phones, flags };
}

export async function checkPhoneDuplicate(phoneNumber: string, excludeId?: number) {
  const conditions = [eq(devoteePhones.phoneNumber, phoneNumber)];
  if (excludeId) {
    conditions.push(ne(devoteePhones.devoteeId, excludeId));
  }
  const [match] = await db
    .select({ devoteeId: devoteePhones.devoteeId, fullName: devotees.fullName })
    .from(devoteePhones)
    .leftJoin(devotees, eq(devoteePhones.devoteeId, devotees.id))
    .where(and(...conditions))
    .limit(1);
  return match ?? null;
}
