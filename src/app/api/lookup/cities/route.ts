import { NextRequest, NextResponse } from 'next/server';
import { createCity, getCitiesByState } from '@/db/queries/lookups';
import { requireAdmin } from '@/lib/auth';
import { createCitySchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const stateId = Number(request.nextUrl.searchParams.get('stateId'));
  if (!Number.isInteger(stateId) || stateId < 1) {
    return NextResponse.json({ error: 'stateId is required.' }, { status: 400 });
  }
  return NextResponse.json(await getCitiesByState(stateId), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const parsed = createCitySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const result = await createCity(parsed.data.stateId, parsed.data.name);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.existingId ? { existingId: result.existingId } : {}) },
      { status: result.status },
    );
  }

  return NextResponse.json(
    { id: result.id, name: result.name },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
