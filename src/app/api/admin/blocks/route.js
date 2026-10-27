import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';
import { parseStay, assertFree, text } from '@/lib/server/validation';

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(store.blocks.all());
}

export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  try {
    const { venue, unit, arrival, departure, rooms } = parseStay(body);
    const block = {
      id: randomUUID(),
      place: venue.id,
      floor: unit.floor.id,
      room: unit.room.id,
      rooms,
      arrival,
      departure,
      note: text(body.note, 200),
      createdAt: new Date().toISOString()
    };
    assertFree(
      block,
      null,
      'Not enough free rooms on those dates — confirmed bookings or other blocks already take them.'
    );
    const store = getStore();
    return NextResponse.json(store.blocks.add(block), { status: 201 });
  } catch (err) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
