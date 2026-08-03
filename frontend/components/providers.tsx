"use client";
import React from 'react';
import { AuthProvider } from './auth/auth-context';
import { SidebarProvider } from './ui/SidebarContext';
import { ThemeProvider } from '../lib/theme-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
