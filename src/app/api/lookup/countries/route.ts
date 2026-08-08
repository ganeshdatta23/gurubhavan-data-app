import { NextResponse } from 'next/server';
import { getCountries } from '@/db/queries/lookups';

export async function GET() {
  return NextResponse.json(await getCountries(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
