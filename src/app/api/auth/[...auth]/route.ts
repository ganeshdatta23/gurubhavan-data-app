import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession, getSession, loginUser } from '@/lib/auth';
import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validators';
import { isSameOriginMutation } from '@/lib/mutation-origin';

type Context = { params: Promise<{ auth: string[] }> };

function clientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest, { params }: Context) {
  const action = (await params).auth[0];
  if (action === 'login' && !isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (action === 'logout') {
    if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    await destroySession();
    return NextResponse.json({ ok: true });
  }
  if (action !== 'login') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Enter username and password.' }, { status: 400 });
  }

  const rateKey = `login:${clientIp(request)}:${parsed.data.username}`;
  const limited = checkRateLimit(rateKey, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    const mins = Math.ceil(limited.retryAfterSec / 60);
    return NextResponse.json(
      { error: `Too many attempts. Wait about ${mins} minute${mins === 1 ? '' : 's'} and try again.` },
      { status: 429 },
    );
  }

  const result = await loginUser(parsed.data.username, parsed.data.password);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  clearRateLimit(rateKey);
  await createSession(result.payload);
  return NextResponse.json({ user: result.payload });
}

export async function GET(_request: NextRequest, { params }: Context) {
  if ((await params).auth[0] !== 'me') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getSession();
  return session
    ? NextResponse.json({ user: session })
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
