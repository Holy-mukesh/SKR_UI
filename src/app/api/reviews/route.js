import { NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';
import { getClientIp, reviewLimit } from '@/lib/server/auth';
import { parseReview } from '@/lib/server/validation';

export async function GET() {
  const store = getStore();
  return NextResponse.json(store.reviews.all());
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    reviewLimit.check(ip);
    const body = await request.json();
    const review = parseReview(body);
    reviewLimit.hit(ip);
    const store = getStore();
    return NextResponse.json(store.reviews.add(review), { status: 201 });
  } catch (err) {
    const status = err.status || (err.message.includes('Too many') ? 429 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
