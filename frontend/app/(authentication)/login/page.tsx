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

  /* ── Pending approval ─────────────────────────────────────────────────── */
  if (state === 'pending_approval') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
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
        </div>
      </div>
    );
  }

  /* ── Forgot password ──────────────────────────────────────────────────── */
  if (state === 'forgot_pw') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 0 30px rgba(37,99,235,0.4)' }}>
              <span className="text-2xl">🎓</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>IPMS</h1>
            </div>
          </div>
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
      </div>
    );
  }

  /* ── Reset link sent ──────────────────────────────────────────────────── */
  if (state === 'reset_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
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
        </div>
      </div>
    );
  }

  /* ── Login form ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 0 30px rgba(37,99,235,0.4)' }}>
            <span className="text-2xl">🎓</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>IPMS</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Intelligent Project Monitoring System</p>
          </div>
        </div>

        {/* Card */}
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
    </div>
  );
}
