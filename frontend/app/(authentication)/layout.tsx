import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Deep background glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '60%', height: '70%',
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '55%', height: '60%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '40%', height: '40%',
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
