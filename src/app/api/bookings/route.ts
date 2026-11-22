import { NextRequest, NextResponse } from 'next/server';
import { withPlaceLock } from '@/lib/server/store';
import { getClientIp, bookingLimit } from '@/lib/server/auth';
import { parseBooking, assertFree } from '@/lib/server/validation';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    bookingLimit.check(ip);
    const body = await request.json();
    const booking = parseBooking(body);
    // Bookings start as 'new' requests; the lock still stops two requests racing past the check
    await withPlaceLock(booking.place, async store => {
      await assertFree(booking, null, 'Sorry — those dates were just taken for this room. Please choose other dates or another floor.', store);
      await store.bookings.add(booking as any);
    });
    bookingLimit.hit(ip);
    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (err: any) {
    const status = err.status || (err.message?.includes('Too many') ? 429 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
