import { NextRequest, NextResponse } from 'next/server';
import { and, asc, count, eq, inArray, isNull, like, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { cities, devotees, devoteePhones, states } from '@/db/schema';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !['super_admin', 'admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { stateIds?: number[]; cityIds?: number[]; q?: string; page?: number; limit?: number };
  const stateIds = [...new Set((body.stateIds || []).filter(Number.isInteger).filter((id) => id > 0))];
  const cityIds = [...new Set((body.cityIds || []).filter(Number.isInteger).filter((id) => id > 0))];
  const page = Math.max(1, body.page || 1); const limit = Math.min(100, Math.max(10, body.limit || 50));
  const conditions = [isNull(devotees.deletedAt), eq(devotees.whatsappOptedOut, false), eq(devoteePhones.isPrimary, true)];
  if (session.role === 'admin' && session.sourceGroupId) conditions.push(eq(devotees.sourceGroupId, session.sourceGroupId));
  // A city selection refines the state selection. With no cities, all selected states are included.
  if (cityIds.length) conditions.push(inArray(devotees.cityId, cityIds)); else if (stateIds.length) conditions.push(inArray(devotees.stateId, stateIds));
  if (body.q?.trim()) { const query = body.q.trim(); const digits = query.replace(/\D/g, ''); conditions.push(or(like(devotees.fullName, `%${query}%`), ...(digits ? [like(devoteePhones.phoneNumber, `%${digits}%`)] : []))!); }
  const where = and(...conditions);
  const [data, [{ total }]] = await Promise.all([
    db.select({ id: devotees.id, fullName: devotees.fullName, phoneNumber: devoteePhones.phoneNumber, stateName: states.name, cityName: cities.name }).from(devotees).innerJoin(devoteePhones, eq(devoteePhones.devoteeId, devotees.id)).leftJoin(states, eq(devotees.stateId, states.id)).leftJoin(cities, eq(devotees.cityId, cities.id)).where(where).orderBy(asc(devotees.fullName)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(devotees).innerJoin(devoteePhones, eq(devoteePhones.devoteeId, devotees.id)).where(where),
  ]);
  return NextResponse.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
}
