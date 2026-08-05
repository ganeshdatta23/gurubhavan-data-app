import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listDevotees } from '@/db/queries/devotees';
import { db } from '@/db';
import { devotees, devoteePhones, reviewFlags } from '@/db/schema';
import { devoteeQuerySchema, devoteeFormSchema } from '@/lib/validators/index';
import { eq, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = devoteeQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  // Scope admins to their chapter
  if (session.role === 'admin' && session.sourceGroupId) {
    parsed.data.sourceGroupId = session.sourceGroupId;
  }

  const { rows, total } = await listDevotees(parsed.data);
  return NextResponse.json({
    data: rows,
    pagination: {
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
      totalPages: Math.ceil(total / parsed.data.limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'super_admin' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = devoteeFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { primaryPhone, secondaryPhones, primaryCountryCode, ...devoteeData } = parsed.data;

  const [devotee] = await db
    .insert(devotees)
    .values({ ...devoteeData, createdBy: session.userId, recordStatus: 'needs_review' })
    .returning();

  // Insert phones
  const phoneRows = [
    { devoteeId: devotee.id, phoneNumber: primaryPhone, isPrimary: true, countryCode: primaryCountryCode },
    ...secondaryPhones.map((p) => ({ devoteeId: devotee.id, phoneNumber: p, isPrimary: false, countryCode: primaryCountryCode })),
  ];
  await db.insert(devoteePhones).values(phoneRows);

  return NextResponse.json({ id: devotee.id }, { status: 201 });
}
