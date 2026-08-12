import { NextRequest, NextResponse } from 'next/server';
import { createState, getStatesByCountry } from '@/db/queries/lookups';
import { requireAdmin } from '@/lib/auth';
import { createStateSchema } from '@/lib/validators';
import { isSameOriginMutation } from '@/lib/mutation-origin';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const countryId = Number(request.nextUrl.searchParams.get('countryId'));
  if (!Number.isInteger(countryId) || countryId < 1) {
    return NextResponse.json({ error: 'countryId is required.' }, { status: 400 });
  }
  return NextResponse.json(await getStatesByCountry(countryId), {
    // Do not cache — location seed updates must show immediately.
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await requireAdmin();

  const parsed = createStateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const result = await createState(parsed.data.countryId, parsed.data.name);
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
