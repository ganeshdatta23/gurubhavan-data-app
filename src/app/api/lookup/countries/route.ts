import { NextRequest, NextResponse } from 'next/server';
import { createCountry, getCountries } from '@/db/queries/lookups';
import { requireAdmin } from '@/lib/auth';
import { createCountrySchema } from '@/lib/validators';
import { isSameOriginMutation } from '@/lib/mutation-origin';

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await getCountries(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await requireAdmin();

  const parsed = createCountrySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const result = await createCountry(parsed.data.name);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.existingId ? { existingId: result.existingId } : {}) },
      { status: result.status },
    );
  }

  return NextResponse.json(
    { id: result.id, name: result.name, iso2: result.iso2 },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
