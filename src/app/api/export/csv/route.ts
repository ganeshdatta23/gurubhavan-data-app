import { NextRequest, NextResponse } from 'next/server';
import { fetchForExport } from '@/lib/exporters/fetchForExport';
import { requireAdmin } from '@/lib/auth';
import { devoteeQuerySchema } from '@/lib/validators';

const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function GET(request: NextRequest) {
  await requireAdmin();
  const parsed = devoteeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const rows = await fetchForExport(parsed.data);
  const csv = [
    ['Full Name', 'Mobile', 'Address', 'City', 'State', 'PIN', 'Country', 'Email'].map(quote).join(','),
    ...rows.map((row) => [row.fullName, row.mobile, row.address, row.city, row.state, row.postalCode, row.country, row.email].map(quote).join(',')),
  ].join('\r\n');
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="guru-bhavan-people-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
