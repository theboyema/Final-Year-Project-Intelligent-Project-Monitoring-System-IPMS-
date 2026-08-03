"use client";
import React from 'react';
import Sidebar from '../../components/ui/Sidebar';
import Navbar from '../../components/ui/Navbar';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Navbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
