import { db } from '@/db';
import { devotees, devoteePhones, reviewFlags, cities, states, countries, sourceGroups } from '@/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { ExportRow } from '@/types';

export async function fetchForExport(ids?: number[]): Promise<ExportRow[]> {
  const where = ids?.length
    ? and(isNull(devotees.deletedAt), inArray(devotees.id, ids))
    : isNull(devotees.deletedAt);

  const rows = await db
    .select({
      id: devotees.id,
      fullName: devotees.fullName,
      addressLine1: devotees.addressLine1,
      addressLine2: devotees.addressLine2,
      addressLine3: devotees.addressLine3,
      postalCode: devotees.postalCode,
      recordStatus: devotees.recordStatus,
      cityName: cities.name,
      stateName: states.name,
      countryName: countries.name,
      chapterName: sourceGroups.name,
    })
    .from(devotees)
    .leftJoin(cities, eq(devotees.cityId, cities.id))
    .leftJoin(states, eq(devotees.stateId, states.id))
    .leftJoin(countries, eq(devotees.countryId, countries.id))
    .leftJoin(sourceGroups, eq(devotees.sourceGroupId, sourceGroups.id))
    .where(where)
    .orderBy(devotees.fullName);

  const devIds = rows.map((r) => r.id);
  if (!devIds.length) return [];

  const [phones, flags] = await Promise.all([
    db.select({ devoteeId: devoteePhones.devoteeId, phoneNumber: devoteePhones.phoneNumber, isPrimary: devoteePhones.isPrimary })
      .from(devoteePhones).where(inArray(devoteePhones.devoteeId, devIds)),
    db.select({ devoteeId: reviewFlags.devoteeId, flag: reviewFlags.flag })
      .from(reviewFlags).where(and(inArray(reviewFlags.devoteeId, devIds), isNull(reviewFlags.resolvedAt))),
  ]);

  const phoneMap = new Map<number, { primary: string; secondary: string[] }>();
  for (const p of phones) {
    const entry = phoneMap.get(p.devoteeId) ?? { primary: '', secondary: [] };
    if (p.isPrimary) entry.primary = p.phoneNumber;
    else entry.secondary.push(p.phoneNumber);
    phoneMap.set(p.devoteeId, entry);
  }

  const flagMap = new Map<number, string[]>();
  for (const f of flags) {
    const arr = flagMap.get(f.devoteeId) ?? [];
    arr.push(f.flag);
    flagMap.set(f.devoteeId, arr);
  }

  return rows.map((r, i) => ({
    serial: i + 1,
    name: r.fullName,
    primaryPhone: phoneMap.get(r.id)?.primary ?? '',
    secondaryPhones: (phoneMap.get(r.id)?.secondary ?? []).join(', '),
    addressLine1: r.addressLine1 ?? '',
    addressLine2: r.addressLine2 ?? '',
    addressLine3: r.addressLine3 ?? '',
    city: r.cityName ?? '',
    state: r.stateName ?? '',
    country: r.countryName ?? '',
    postalCode: r.postalCode ?? '',
    chapter: r.chapterName ?? '',
    status: r.recordStatus,
    flags: (flagMap.get(r.id) ?? []).join('; '),
  }));
}
