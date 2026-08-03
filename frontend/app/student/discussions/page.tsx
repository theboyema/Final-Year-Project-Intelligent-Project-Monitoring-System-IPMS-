"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDiscussionsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/student/messages'); }, [router]);
  return null;
}
