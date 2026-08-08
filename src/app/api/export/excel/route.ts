import { NextRequest, NextResponse } from 'next/server';
import { fetchForExport } from '@/lib/exporters/fetchForExport';
import { toExcel } from '@/lib/exporters/toExcel';
import { requireAdmin } from '@/lib/auth';
import { devoteeQuerySchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  await requireAdmin();
  const parsed = devoteeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const buffer = await toExcel(await fetchForExport(parsed.data));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="guru-bhavan-people-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
