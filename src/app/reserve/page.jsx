'use client';

import { Suspense } from 'react';
import ReserveView from '@/views/Reserve';

export default function ReserveRoute() {
  // useSearchParams (for ?place=) needs a Suspense boundary in the App Router
  return (
    <Suspense fallback={null}>
      <ReserveView />
    </Suspense>
  );
}
