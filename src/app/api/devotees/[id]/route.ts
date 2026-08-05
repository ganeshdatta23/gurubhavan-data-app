import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDevoteeById } from '@/db/queries/devotees';
import { db } from '@/db';
import { devotees, devoteePhones, auditLogs } from '@/db/schema';
import { devoteeUpdateSchema } from '@/lib/validators/index';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const devotee = await getDevoteeById(id);
  if (!devotee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Members can only view their own record
  if (session.role === 'member') {
    const linked = devotee as { linkedUserId?: number | null };
    if (linked.linkedUserId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  if (session.role === 'admin' && session.sourceGroupId && devotee.sourceGroupId !== session.sourceGroupId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(devotee);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number((await params).id);
  const existing = await getDevoteeById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Members can only edit their own linked record
  if (session.role === 'member') {
    const linked = existing as { linkedUserId?: number | null };
    if (linked.linkedUserId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  if (session.role === 'admin' && session.sourceGroupId && existing.sourceGroupId !== session.sourceGroupId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = devoteeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { primaryPhone, secondaryPhones, primaryCountryCode, ...updateData } = parsed.data as {
    primaryPhone?: string;
    secondaryPhones?: string[];
    primaryCountryCode?: string;
    [key: string]: unknown;
  };

  // Members editing their own record → reset to needs_review
  if (session.role === 'member') {
    (updateData as Record<string, unknown>).recordStatus = 'needs_review';
  }

  const oldValues = { ...existing };

  await db
    .update(devotees)
    .set({ ...updateData, updatedBy: session.userId })
    .where(eq(devotees.id, id));

  // Update phones if provided
  if (primaryPhone) {
    await db.update(devoteePhones).set({ phoneNumber: primaryPhone }).where(and(eq(devoteePhones.devoteeId, id), eq(devoteePhones.isPrimary, true)));
  }

  // Audit log
  await db.insert(auditLogs).values({
    userId: session.userId,
    entityType: 'devotee',
    entityId: id,
    action: 'update',
    oldValues: oldValues as Record<string, unknown>,
    newValues: updateData as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== 'super_admin' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = Number((await params).id);
  const existing = await getDevoteeById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role === 'admin' && session.sourceGroupId && existing.sourceGroupId !== session.sourceGroupId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await db.update(devotees).set({ deletedAt: new Date() }).where(eq(devotees.id, id));

  await db.insert(auditLogs).values({
    userId: session.userId,
    entityType: 'devotee',
    entityId: id,
    action: 'delete',
  });

  return NextResponse.json({ ok: true });
}
