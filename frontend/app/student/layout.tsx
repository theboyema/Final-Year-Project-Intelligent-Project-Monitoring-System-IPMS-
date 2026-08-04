"use client";
import React from 'react';
import Sidebar from '../../components/ui/Sidebar';
import Navbar from '../../components/ui/Navbar';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute roles={["STUDENT"]}>
      <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Navbar />
          <main className="p-4 md:p-6 pb-24 md:pb-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
