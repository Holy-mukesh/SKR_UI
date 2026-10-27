import { NextResponse } from 'next/server';
import { removeSession, SESSION_COOKIE } from '@/lib/server/auth';

export async function POST(request) {
  removeSession(request);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    path: '/api',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0
  });
  return response;
}
