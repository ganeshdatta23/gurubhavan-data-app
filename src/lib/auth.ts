import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { SessionPayload } from '@/types';
import { requireJwtSecret } from '@/lib/jwt-secret';

const COOKIE_NAME = 'dr_session';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 1 month

export async function signToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(requireJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, requireJwtSecret());
    if (payload.role !== 'admin' || typeof payload.userId !== 'number') return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);
  return user ? session : null;
}

export async function createSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await signToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SEC,
    path: '/',
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function loginUser(username: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return { success: false as const, error: 'Wrong username or password. Try again.' };
  }

  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  return {
    success: true as const,
    payload: { userId: user.id, username: user.username, name: user.name, role: 'admin' as const },
  };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('UNAUTHORIZED');
  return session;
}
