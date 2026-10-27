import { NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';
import { getClientIp, bookingLimit } from '@/lib/server/auth';
import { parseBooking, assertFree } from '@/lib/server/validation';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    bookingLimit.check(ip);
    const body = await request.json();
    const booking = parseBooking(body);
    assertFree(booking, null, 'Sorry — those dates were just taken for this room. Please choose other dates or another floor.');
    bookingLimit.hit(ip);
    const store = getStore();
    store.bookings.add(booking);
    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (err) {
    const status = err.status || (err.message.includes('Too many') ? 429 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
