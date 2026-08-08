import { NextRequest, NextResponse } from 'next/server';
import { createSession, loginUser } from '@/lib/auth';
import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';
import { absoluteUrl } from '@/lib/request-origin';
import { loginSchema } from '@/lib/validators';

function clientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(absoluteUrl(request, path), 303);
}

/** Classic HTML form POST login (no client JS required). */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || 'Enter username and password.';
    return redirectTo(request, `/login?error=${encodeURIComponent(message)}`);
  }

  const rateKey = `login:${clientIp(request)}:${parsed.data.username}`;
  const limited = checkRateLimit(rateKey, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    const mins = Math.ceil(limited.retryAfterSec / 60);
    return redirectTo(
      request,
      `/login?error=${encodeURIComponent(
        `Too many attempts. Wait about ${mins} minute${mins === 1 ? '' : 's'} and try again.`,
      )}`,
    );
  }

  const result = await loginUser(parsed.data.username, parsed.data.password);
  if (!result.success) {
    return redirectTo(request, `/login?error=${encodeURIComponent(result.error)}`);
  }

  clearRateLimit(rateKey);
  await createSession(result.payload);
  return redirectTo(request, '/admin');
}
