import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { devotees } from '@/db/schema';
import { listDevotees } from '@/db/queries/devotees';
import { findActiveDuplicate, normalizeDevoteeMobile, validateLocation } from '@/lib/devotee-service';
import { requireAdmin } from '@/lib/auth';
import { devoteeFormSchema, devoteeQuerySchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const parsed = devoteeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { rows, total } = await listDevotees(parsed.data);
  return NextResponse.json({
    data: rows,
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  const parsed = devoteeFormSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const locationError = await validateLocation(parsed.data);
  if (locationError) return NextResponse.json({ error: locationError }, { status: 400 });
  const normalized = await normalizeDevoteeMobile(parsed.data);
  if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });
  const mobile = normalized.mobile;
  const duplicate = await findActiveDuplicate(mobile, parsed.data.countryId);
  if (duplicate) {
    return NextResponse.json({ error: `That mobile number is already saved for ${duplicate.fullName}.`, duplicate }, { status: 409 });
  }

  const now = new Date();
  try {
    const [created] = await db.insert(devotees).values({
      ...parsed.data,
      mobile,
      postalCode: parsed.data.postalCode || null,
      email: parsed.data.email || null,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: devotees.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /unique constraint|unique failed/i.test(error.message)) {
      const concurrentDuplicate = await findActiveDuplicate(mobile, parsed.data.countryId);
      return NextResponse.json({
        error: concurrentDuplicate
          ? `That mobile number is already saved for ${concurrentDuplicate.fullName}.`
          : 'That mobile number was saved by another request. Please search before trying again.',
        duplicate: concurrentDuplicate,
      }, { status: 409 });
    }
    throw error;
  }
}
