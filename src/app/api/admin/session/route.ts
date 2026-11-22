import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/auth';

/* Who is signed in: { username, place } — place is null for the superadmin */
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  return NextResponse.json(user);
}
