import { NextResponse } from 'next/server';
import { getCountries } from '@/db/queries/lookups';

export async function GET() {
  const data = await getCountries();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
