import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsOverview } from '@/db/queries/analytics';
import { requireAdmin } from '@/lib/auth';
import { analyticsQuerySchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const parsed = analyticsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  return NextResponse.json(await getAnalyticsOverview(parsed.data, parsed.data.days), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
