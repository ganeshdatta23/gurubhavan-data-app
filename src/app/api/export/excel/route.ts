import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchForExport } from '@/lib/exporters/fetchForExport';
import { toExcel } from '@/lib/exporters/toExcel';
import { exportBodySchema } from '@/lib/validators/index';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'super_admin' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = exportBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const rows = await fetchForExport(parsed.data.ids);
  const buffer = await toExcel(rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="devotees-${Date.now()}.xlsx"`,
    },
  });
}
