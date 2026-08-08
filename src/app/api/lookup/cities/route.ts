import { NextRequest, NextResponse } from 'next/server';
import { getCitiesByState, getCitiesByDistrict } from '@/db/queries/lookups';

export async function GET(request: NextRequest) {
  const districtId = Number(request.nextUrl.searchParams.get('districtId'));
  const stateId = Number(request.nextUrl.searchParams.get('stateId'));
  if (districtId) {
    const data = await getCitiesByDistrict(districtId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  }
  if (stateId) {
    const data = await getCitiesByState(stateId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  }
  return NextResponse.json({ error: 'districtId or stateId required' }, { status: 400 });
}
