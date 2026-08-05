import { NextRequest, NextResponse } from 'next/server';
import { getStatesByCountry } from '@/db/queries/lookups';

export async function GET(request: NextRequest) {
  const countryId = Number(request.nextUrl.searchParams.get('countryId'));
  const data = countryId ? await getStatesByCountry(countryId) : await import('@/db/queries/lookups').then(({ getStates }) => getStates());
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
