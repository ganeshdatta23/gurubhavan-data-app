import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { findActiveDuplicate } from '@/lib/devotee-service';
import { duplicateCheckSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  await requireAdmin();
  const parsed = duplicateCheckSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid mobile number.' }, { status: 400 });
  const duplicate = await findActiveDuplicate(parsed.data.mobile, parsed.data.excludeId);
  return NextResponse.json({ isDuplicate: Boolean(duplicate), existingRecord: duplicate });
}
