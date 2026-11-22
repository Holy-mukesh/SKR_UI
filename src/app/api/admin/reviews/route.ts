import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(await store.reviews.all(user.place ?? undefined));
}
