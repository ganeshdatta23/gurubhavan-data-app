import { and, eq, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { devotees } from '@/db/schema';
import { getDevoteeById } from '@/db/queries/devotees';
import { findActiveDuplicate, normalizeDevoteeMobile, validateLocation } from '@/lib/devotee-service';
import { requireAdmin } from '@/lib/auth';
import { devoteeFormSchema } from '@/lib/validators';

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: Context) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid person ID.' }, { status: 400 });
  const row = await getDevoteeById(id);
  return row ? NextResponse.json(row) : NextResponse.json({ error: 'Person not found.' }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const session = await requireAdmin();
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid person ID.' }, { status: 400 });
  const parsed = devoteeFormSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const locationError = await validateLocation(parsed.data);
  if (locationError) return NextResponse.json({ error: locationError }, { status: 400 });
  const normalized = await normalizeDevoteeMobile(parsed.data);
  if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });
  const mobile = normalized.mobile;
  const duplicate = await findActiveDuplicate(mobile, id);
  if (duplicate) return NextResponse.json({ error: `That mobile number is already saved for ${duplicate.fullName}.` }, { status: 409 });

  const result = await db.update(devotees).set({
    ...parsed.data,
    mobile,
    postalCode: parsed.data.postalCode || null,
    email: parsed.data.email || null,
    updatedBy: session.userId,
    updatedAt: new Date(),
  }).where(and(eq(devotees.id, id), isNull(devotees.deletedAt))).returning({ id: devotees.id });
  return result.length
    ? NextResponse.json({ id })
    : NextResponse.json({ error: 'Person not found.' }, { status: 404 });
}

export const PATCH = PUT;

export async function DELETE(_request: NextRequest, { params }: Context) {
  const session = await requireAdmin();
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid person ID.' }, { status: 400 });
  const now = new Date();
  const result = await db.update(devotees)
    .set({ deletedAt: now, updatedAt: now, updatedBy: session.userId })
    .where(and(eq(devotees.id, id), isNull(devotees.deletedAt)))
    .returning({ id: devotees.id });
  return result.length
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Person not found.' }, { status: 404 });
}
