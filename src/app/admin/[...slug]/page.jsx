'use client';

import dynamic from 'next/dynamic';

const Admin = dynamic(() => import('@/admin/Admin'), { ssr: false });

export default function AdminSubRoute() {
  return <Admin />;
}
