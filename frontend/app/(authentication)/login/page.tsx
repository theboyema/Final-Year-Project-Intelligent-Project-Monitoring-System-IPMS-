"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/auth/auth-context';

type LoginState = 'idle' | 'loading' | 'pending_approval' | 'forgot_pw' | 'reset_sent';

export default function LoginPage() {
  const { login, sendLoginLink, user, hydrated } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [state, setState]       = useState<LoginState>('idle');
  const [error, setError]       = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resetEmail, setResetEmail]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.mustChangePassword) { window.location.href = '/change-password'; return; }
    const dest = user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/supervisor' : '/student';
    window.location.href = dest;
  }, [user, hydrated]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setState('loading');
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err?.message === 'PENDING_APPROVAL') {
        setPendingEmail(email.trim());
        setState('pending_approval');
      } else {
        setError(err?.message || 'Unable to sign in. Please try again.');
        setState('idle');
      }
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await sendLoginLink(resetEmail.trim());
    } catch {
      // Firebase doesn't reveal whether the email exists — always show success
    } finally {
      setResetLoading(false);
      setState('reset_sent');
    }
  };

  if (!hydrated) return null;

  /* ── Shared background wrapper ───────────────────────────────────────────── */
  const Bg = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden style={{ position: 'absolute', top: '-15%', left: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Graduation cap watermark */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 300 260" fill="currentColor" style={{ width: 'min(75vw, 520px)', opacity: 0.032, color: 'var(--text-1)', filter: 'blur(1px)' }}>
          <polygon points="150,24 284,88 150,152 16,88" />
          <path d="M68 106 Q68 158 150 168 Q232 158 232 106" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"/>
          <ellipse cx="150" cy="168" rx="82" ry="17" />
          <line x1="284" y1="88" x2="284" y2="158" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
          <rect x="270" y="155" width="28" height="10" rx="5" />
          <line x1="274" y1="165" x2="268" y2="210" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <line x1="280" y1="165" x2="278" y2="214" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <line x1="286" y1="165" x2="288" y2="210" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <line x1="292" y1="165" x2="298" y2="206" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <ellipse cx="267" cy="213" rx="5" ry="7" />
          <ellipse cx="278" cy="217" rx="5" ry="7" />
          <ellipse cx="289" cy="213" rx="5" ry="7" />
          <ellipse cx="299" cy="209" rx="5" ry="7" />
        </svg>
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );

  /* ── Pending approval ─────────────────────────────────────────────────── */
  if (state === 'pending_approval') {
    return (
      <Bg>
        <div className="card p-8 text-center space-y-5" style={{ border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 0 40px rgba(245,158,11,0.05), 0 4px 32px rgba(0,0,0,0.4)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>⏳</div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Approval Pending</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>
              Your admin account for <span className="font-medium" style={{ color: 'var(--text-1)' }}>{pendingEmail}</span> is awaiting approval from an existing administrator.
            </p>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm text-left space-y-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="font-semibold text-amber-300">What happens next?</p>
            <p className="text-slate-400 text-xs">An existing admin will review your request. Once approved you can sign in normally.</p>
          </div>
          <button onClick={() => { setState('idle'); setError(null); setPassword(''); }} className="btn-secondary w-full">
            ← Back to Sign In
          </button>
        </div>
      </Bg>
    );
  }

  /* ── Forgot password ──────────────────────────────────────────────────── */
  if (state === 'forgot_pw') {
    return (
      <Bg>
        <div className="space-y-6">
          <LogoBrand />
          <div className="card p-8 space-y-5">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Reset your password</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Enter the email address on your account. We'll send a reset link.</p>
            </div>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  className="input" placeholder="you@university.edu" autoFocus
                />
              </div>
              <button type="submit" disabled={resetLoading} className="btn-primary w-full py-3">
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button onClick={() => { setState('idle'); setResetEmail(''); }} className="text-xs w-full text-center font-semibold" style={{ color: 'var(--text-3)' }}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </Bg>
    );
  }

  /* ── Reset link sent ──────────────────────────────────────────────────── */
  if (state === 'reset_sent') {
    return (
      <Bg>
        <div className="card p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>✉</div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Check your email</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>
              If <span className="font-medium" style={{ color: 'var(--text-1)' }}>{resetEmail}</span> is registered, a password reset link has been sent. Check your spam folder if you don't see it.
            </p>
          </div>
          <button onClick={() => { setState('idle'); setResetEmail(''); setError(null); }} className="btn-secondary w-full">
            ← Back to Sign In
          </button>
        </div>
      </Bg>
    );
  }

  /* ── Login form ───────────────────────────────────────────────────────── */
  return (
    <Bg>
      <div className="space-y-6">
        <LogoBrand />

        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Sign in to your account</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <span className="text-red-400 shrink-0 mt-0.5">✕</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@university.edu" autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <button type="button" onClick={() => { setResetEmail(email.trim()); setState('forgot_pw'); }}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-14" placeholder="Enter your password" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition" tabIndex={-1}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={state === 'loading'} className="btn-primary w-full py-3">
              {state === 'loading' ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
              Want administrator access?{' '}
              <Link href="/register" className="font-semibold text-blue-500 hover:text-blue-400 transition">Apply for an admin account →</Link>
            </p>
          </div>
        </div>
      </div>
    </Bg>
  );
}

/* ── Logo / brand header ─────────────────────────────────────────────────── */
function LogoBrand() {
  return (
    <div className="text-center space-y-3">
      <div className="relative inline-flex items-center justify-center">
        {/* Glow ring */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: 32,
          background: 'linear-gradient(135deg, rgba(37,99,235,0.4), rgba(79,70,229,0.3))',
          filter: 'blur(10px)',
        }} />
        {/* Icon */}
        <div className="relative flex items-center justify-center rounded-3xl" style={{
          width: 80, height: 80,
          background: 'linear-gradient(145deg, #1e40af 0%, #2563eb 45%, #4f46e5 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.12) inset, 0 8px 32px rgba(37,99,235,0.45)',
        }}>
          <span style={{ fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}>🎓</span>
        </div>
      </div>
      <div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
          IPMS
        </h1>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-3)' }}>
          Intelligent Project Monitoring System
        </p>
      </div>
    </div>
  );
}
