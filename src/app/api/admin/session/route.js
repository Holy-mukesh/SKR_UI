import { NextResponse } from 'next/server';
import { verifyAdmin, ADMIN_USERNAME } from '@/lib/server/auth';

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  return NextResponse.json({ username: ADMIN_USERNAME });
}
