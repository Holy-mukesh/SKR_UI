import { NextResponse } from 'next/server';
import { venueById, getAvailability } from '@/lib/server/validation';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const place = searchParams.get('place');
  const venue = venueById(place);
  if (!venue) {
    return NextResponse.json({ error: 'Unknown place.' }, { status: 400 });
  }
  return NextResponse.json(getAvailability(venue));
}
