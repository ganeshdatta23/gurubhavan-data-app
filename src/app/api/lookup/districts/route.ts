import { NextRequest, NextResponse } from 'next/server';
import { getDistrictsByState } from '@/db/queries/lookups';

export async function GET(request: NextRequest) {
  const stateId = Number(request.nextUrl.searchParams.get('stateId'));
  if (!stateId) return NextResponse.json({ error: 'stateId required' }, { status: 400 });
  const data = await getDistrictsByState(stateId);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
