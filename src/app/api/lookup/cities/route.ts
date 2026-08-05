import { NextRequest, NextResponse } from 'next/server';
import { getCitiesByState } from '@/db/queries/lookups';
import { db } from '@/db';
import { cities } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const stateIds = (request.nextUrl.searchParams.get('stateIds') || request.nextUrl.searchParams.get('stateId') || '').split(',').map(Number).filter(Number.isInteger).filter((id) => id > 0);
  if (!stateIds.length) return NextResponse.json({ error: 'stateId or stateIds required' }, { status: 400 });
  const data = stateIds.length === 1 ? await getCitiesByState(stateIds[0]) : await db.select({ id: cities.id, name: cities.name, stateId: cities.stateId }).from(cities).where(inArray(cities.stateId, stateIds)).orderBy(cities.name);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
