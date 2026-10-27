'use client';

import Home from '@/views/Home';
import { useSite } from '@/site';

export default function HomePage() {
  const { introPending, finishIntro } = useSite();
  return <Home introPending={introPending} onIntroDone={finishIntro} />;
}
