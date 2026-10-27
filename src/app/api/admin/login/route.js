import { NextResponse } from 'next/server';
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  getClientIp,
  loginLimit,
  safeCompare,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_HOURS
} from '@/lib/server/auth';

export async function POST(request) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Admin login is not set up on the server (ADMIN_USERNAME / ADMIN_PASSWORD).' },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  try {
    loginLimit.check(ip);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { username, password } = body || {};
  const ok = [safeCompare(username ?? '', ADMIN_USERNAME), safeCompare(password ?? '', ADMIN_PASSWORD)].every(Boolean);

  if (!ok) {
    loginLimit.hit(ip);
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
  }

  loginLimit.clear(ip);
  const token = createSessionToken();

  const response = NextResponse.json({ username: ADMIN_USERNAME });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    path: '/api',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 3600,
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}
