import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/auth';
import { getStore } from '@/lib/server/store';

export async function DELETE(request, { params }) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  if (!store.blocks.remove(id)) {
    return NextResponse.json({ error: 'Already deleted.' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
