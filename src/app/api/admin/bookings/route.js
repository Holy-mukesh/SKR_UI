import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(store.bookings.all());
}
