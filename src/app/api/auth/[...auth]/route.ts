import { NextRequest, NextResponse } from 'next/server';
import { loginUser, registerUser, createSession, destroySession, getSession } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validators/index';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auth: string[] }> }
) {
  const { auth } = await params;
  const action = auth[0];

  if (action === 'login') {
    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await loginUser(parsed.data.email, parsed.data.password);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 401 });
    await createSession(result.payload);
    return NextResponse.json({ user: result.payload });
  }

  if (action === 'register') {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 });
    await createSession(result.payload);
    return NextResponse.json({ user: result.payload }, { status: 201 });
  }

  if (action === 'logout') {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auth: string[] }> }
) {
  const { auth } = await params;
  if (auth[0] === 'me') {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ user: session });
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
