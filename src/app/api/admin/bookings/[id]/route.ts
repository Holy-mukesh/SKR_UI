import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, canAccess } from '@/lib/server/auth';
import { getStore, withPlaceLock } from '@/lib/server/store';
import { STATUSES, assertFree, assignRooms } from '@/lib/server/validation';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  const item = await store.bookings.get(id);
  if (item && !canAccess(user, item.place)) {
    return NextResponse.json({ error: 'This record belongs to another property.' }, { status: 403 });
  }
  if (!(await store.bookings.remove(id))) {
    return NextResponse.json({ error: 'Already deleted.' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { status } = body || {};
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }

  const current = await store.bookings.get(id);
  if (!current) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (!canAccess(user, current.place)) {
    return NextResponse.json({ error: 'This record belongs to another property.' }, { status: 403 });
  }

  let updated;
  try {
    updated = await withPlaceLock(current.place, async tx => {
      const latest = await tx.bookings.get(id);
      if (!latest) return null;
      if (status === 'confirmed' && latest.status !== 'confirmed' && latest.room) {
        await assertFree(
          latest,
          id,
          'Those rooms are already taken on some of these dates (by another confirmed booking or a block). Free them first, or move this guest.',
          tx
        );
      }
      // Confirming gives the guest real room numbers (shown in Room Layout); any other status frees them
      let numbers: string[] = [];
      if (status === 'confirmed') {
        numbers = latest.status === 'confirmed' && latest.roomNumbers?.length ? latest.roomNumbers : await assignRooms(latest, tx);
      }
      return tx.bookings.update(id, {
        status,
        roomNumbers: numbers,
        roomNumber: numbers.join(', '),
        updatedAt: new Date().toISOString()
      } as any);
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 409 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
