import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDevoteeIds } from '@/db/queries/devotees';
import { devoteeQuerySchema } from '@/lib/validators/index';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = devoteeQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  if (session.role === 'admin' && session.sourceGroupId) {
    parsed.data.sourceGroupId = session.sourceGroupId;
  }

  const { page: _p, limit: _l, sort: _s, ...filters } = parsed.data;
  const ids = await getDevoteeIds(filters);
  return NextResponse.json({ ids });
}
