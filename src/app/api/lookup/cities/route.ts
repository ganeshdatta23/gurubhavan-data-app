import { NextRequest, NextResponse } from 'next/server';
import { getCitiesByState } from '@/db/queries/lookups';

export async function GET(request: NextRequest) {
  const stateId = Number(request.nextUrl.searchParams.get('stateId'));
  if (!Number.isInteger(stateId) || stateId < 1) {
    return NextResponse.json({ error: 'stateId is required.' }, { status: 400 });
  }
  return NextResponse.json(await getCitiesByState(stateId), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
