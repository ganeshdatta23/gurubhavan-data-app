import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { toExcel } from '@/lib/exporters/toExcel';

export const runtime = 'nodejs';

export async function GET() {
  await requireAdmin();
  const buffer = await toExcel([]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="guru-bhavan-import-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
