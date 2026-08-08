import { NextRequest, NextResponse } from 'next/server';
import { getStatesByCountry } from '@/db/queries/lookups';

export async function GET(request: NextRequest) {
  const countryId = Number(request.nextUrl.searchParams.get('countryId'));
  if (!Number.isInteger(countryId) || countryId < 1) {
    return NextResponse.json({ error: 'countryId is required.' }, { status: 400 });
  }
  return NextResponse.json(await getStatesByCountry(countryId), {
    // Do not cache — location seed updates must show immediately.
    headers: { 'Cache-Control': 'no-store' },
  });
}
