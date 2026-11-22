import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdmin, canAccess } from '@/lib/server/auth';
import { getStore, withPlaceLock } from '@/lib/server/store';
import { assertFree, roomsInUse, text } from '@/lib/server/validation';
import type { FrontDeskReservation } from '@/types';

export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const store = getStore();
  return NextResponse.json(await store.reservations.all(user.place ?? undefined));
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
    const {
      place,
      floor,
      floorName,
      room,
      roomName,
      roomNumber,
      bookingChannel = 'in_person',
      paymentMode = 'cash',
      name,
      phone,
      arrival,
      departure,
      nights = 1,
      ratePerNight = 2500,
      subtotal = 2500,
      gst = 125,
      total = 2625
    } = body || {};

    if (!canAccess(user, place)) {
      return NextResponse.json({ error: 'You can only add reservations at your own property.' }, { status: 403 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Please enter guest name.' }, { status: 400 });
    }
    if (!roomNumber) {
      return NextResponse.json({ error: 'Please choose a room.' }, { status: 400 });
    }

    const reservation: FrontDeskReservation = {
      id: randomUUID(),
      created: new Date().toISOString(),
      place,
      floor,
      floorName: floorName || floor,
      room,
      roomName: roomName || room,
      roomNumber,
      bookingChannel: bookingChannel === 'website' ? 'website' : 'in_person',
      paymentMode: ['cash', 'gpay', 'card'].includes(paymentMode) ? paymentMode : 'cash',
      name: text(name, 80),
      phone: text(phone, 30),
      arrival,
      departure,
      nights: Number(nights) || 1,
      ratePerNight: Number(ratePerNight) || 0,
      subtotal: Number(subtotal) || 0,
      gst: Number(gst) || 0,
      total: Number(total) || 0
    };

    // Verify room is free on these dates
    const saved = await withPlaceLock(place, async store => {
      await assertFree(
      {
        place,
        floor,
        room,
        rooms: 1,
        arrival,
        departure
      },
      null,
      `Room ${roomNumber} is already booked on these dates.`,
      store
      );
      const used = await roomsInUse({ place, arrival, departure }, null, store);
      if (used.has(String(roomNumber))) {
        throw Object.assign(new Error(`Room ${roomNumber} is already booked on these dates.`), { status: 409 });
      }
      return store.reservations.add(reservation);
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
