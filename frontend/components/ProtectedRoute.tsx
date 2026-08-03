"use client";
import React, { useEffect } from 'react';
import { useAuth } from './auth/auth-context';

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { window.location.href = '/login'; return; }
    if (user.mustChangePassword) { window.location.href = '/change-password'; return; }
    if (roles && !roles.includes(user.role || '')) {
      const path = user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/supervisor' : '/student';
      window.location.href = path;
    }
  }, [user, hydrated, roles]);

  if (!hydrated) return null;
  if (!user) return null;
  if (user.mustChangePassword) return null;
  if (roles && !roles.includes(user.role || '')) return null;

  return <>{children}</>;
}
