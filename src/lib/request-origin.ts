import type { NextRequest } from 'next/server';

/**
 * Public origin the browser used (supports LAN / network URL access).
 * Next's request.url often stays on http://localhost even when the client
 * opened http://192.168.x.x:3000 — using that for redirects breaks cookies.
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host')?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto =
    forwardedProto ||
    (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'http') ||
    'http';

  if (host) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

export function absoluteUrl(request: NextRequest, path: string): URL {
  return new URL(path, getRequestOrigin(request));
}
