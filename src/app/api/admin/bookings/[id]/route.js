import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';
import { STATUSES, assertFree } from '@/lib/server/validation';

export async function DELETE(request, { params }) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  if (!store.bookings.remove(id)) {
    return NextResponse.json({ error: 'Already deleted.' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request, { params }) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { status } = body || {};
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }

  const current = store.bookings.all().find(b => b.id === id);
  if (!current) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  if (status === 'confirmed' && current.status !== 'confirmed' && current.room) {
    try {
      assertFree(
        current,
        id,
        'Those rooms are already taken on some of these dates (by another confirmed booking or a block). Free them first, or move this guest.'
      );
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
  }

  const updated = store.bookings.update(id, { status, updatedAt: new Date().toISOString() });
  if (!updated) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
