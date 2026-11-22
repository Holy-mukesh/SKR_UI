import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdmin, canAccess } from '@/lib/server/auth';
import { getStore, withPlaceLock } from '@/lib/server/store';
import { parseStay, assertFree, text } from '@/lib/server/validation';

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(await store.blocks.all(user.place ?? undefined));
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  try {
    const { venue, unit, arrival, departure, rooms } = parseStay(body);
    if (!canAccess(user, venue.id)) {
      return NextResponse.json({ error: 'You can only block rooms at your own property.' }, { status: 403 });
    }
    const block = {
      id: randomUUID(),
      place: venue.id,
      floor: unit.floor.id,
      room: unit.room.id,
      rooms,
      arrival,
      departure,
      reason: text(body.note || body.reason, 200),
      created: new Date().toISOString()
    };
    const saved = await withPlaceLock(block.place, async store => {
      await assertFree(
        block,
        null,
        'Not enough free rooms on those dates — confirmed bookings or other blocks already take them.',
        store
      );
      return store.blocks.add(block as any);
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
