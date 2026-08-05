import { NextRequest, NextResponse } from 'next/server';
import { checkPhoneDuplicate } from '@/db/queries/devotees';
import { checkDuplicateSchema } from '@/lib/validators/index';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkDuplicateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const match = await checkPhoneDuplicate(parsed.data.phoneNumber, parsed.data.excludeId);
  if (!match) return NextResponse.json({ isDuplicate: false, warnings: [] });

  return NextResponse.json({
    isDuplicate: true,
    // This route is also used by public/self-service forms. Never disclose
    // another member's identity from a phone-number lookup.
    warnings: ['This number is already registered. Please review the existing record or contact an administrator.'],
  });
}
