import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, loginLimit, login, createSession, SESSION_COOKIE, SESSION_HOURS } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    loginLimit.check(ip);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const user = await login(body?.username ?? '', body?.password ?? '');
  if (!user) {
    loginLimit.hit(ip);
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
  }

  loginLimit.clear(ip);
  const token = await createSession(user.username);

  const response = NextResponse.json(user);
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
