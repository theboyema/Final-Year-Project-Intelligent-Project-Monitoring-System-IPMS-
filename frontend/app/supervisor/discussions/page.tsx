"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupervisorDiscussionsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/supervisor/messages'); }, [router]);
  return null;
}
