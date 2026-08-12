import type { NextRequest } from 'next/server';
import { getRequestOrigin } from '@/lib/request-origin';

/** Reject cross-site browser mutations while allowing trusted non-browser clients. */
export function isSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === getRequestOrigin(request);

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === getRequestOrigin(request);
    } catch {
      return false;
    }
  }

  return true;
}
