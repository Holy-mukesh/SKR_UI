import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, canAccess } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  const item = await store.reviews.get(id);
  if (item && !canAccess(user, item.place)) {
    return NextResponse.json({ error: 'This record belongs to another property.' }, { status: 403 });
  }
  if (!(await store.reviews.remove(id))) {
    return NextResponse.json({ error: 'Already deleted.' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
