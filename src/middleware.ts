import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { absoluteUrl } from '@/lib/request-origin';
import type { SessionPayload } from '@/types';

const COOKIE_NAME = 'dr_session';

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    );
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin' || typeof payload.userId !== 'number') return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith('/admin') && !session) {
    return NextResponse.redirect(absoluteUrl(request, '/login'));
  }
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (pathname === '/login' && session) {
    return NextResponse.redirect(absoluteUrl(request, '/admin'));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/login', '/api/:path*'] };
