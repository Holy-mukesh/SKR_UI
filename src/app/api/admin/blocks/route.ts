import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';
import { parseStay, assertFree, text } from '@/lib/server/validation';

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(store.blocks.all());
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
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
    assertFree(
      block,
      null,
      'Not enough free rooms on those dates — confirmed bookings or other blocks already take them.'
    );
    const store = getStore();
    return NextResponse.json(store.blocks.add(block as any), { status: 201 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
