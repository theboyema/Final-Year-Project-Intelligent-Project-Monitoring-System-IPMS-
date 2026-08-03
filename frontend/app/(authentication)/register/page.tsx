"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/auth/auth-context';

type FormState = 'idle' | 'submitting' | 'approved' | 'pending';

export default function RegisterPage() {
  const { registerAdmin, user, hydrated } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [resultEmail, setResultEmail] = useState('');

  useEffect(() => {
    if (!hydrated || !user) return;
    const dest = user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/supervisor' : '/student';
    window.location.href = dest;
  }, [user, hydrated]);

  const pwStrength = (pw: string) => {
    if (!pw) return 0;
    if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) return 4;
    if (pw.length >= 10 && /[A-Z]/.test(pw)) return 3;
    if (pw.length >= 8) return 2;
    return 1;
  };
  const strength = pwStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim())        return setError('Full name is required.');
    if (!form.email.trim())       return setError('Email address is required.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setState('submitting');
    try {
      const result = await registerAdmin(form.name.trim(), form.email.trim(), form.password);
      setResultEmail(form.email.trim());
      setState(result === 'approved' ? 'approved' : 'pending');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
      setState('idle');
    }
  };

  if (!hydrated) return null;

  if (state === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-md card p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>✓</div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Account Created!</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>You are the first administrator. Your account has been automatically activated.</p>
          </div>
          <div className="rounded-xl px-4 py-3 text-left" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--success-text)' }}>Account</p>
            <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-1)' }}>{resultEmail}</p>
          </div>
          <Link href="/login" className="btn-primary w-full py-3 block text-center">Sign In Now →</Link>
        </div>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-md card p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>⏳</div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Application Submitted</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>Your admin account request is awaiting approval from an existing administrator.</p>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm text-left space-y-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
            <p className="text-xs" style={{ color: 'var(--warning-text)' }}><span className="font-semibold">Email:</span> {resultEmail}</p>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>An existing administrator must approve your request before you can sign in.</p>
          </div>
          <Link href="/login" className="btn-secondary w-full py-3 block text-center">← Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
            <span className="text-2xl">🎓</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>IPMS</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Administrator Registration</p>
          </div>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Create an admin account</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Your application will be reviewed before access is granted.</p>
          </div>

          <div className="rounded-xl px-4 py-3 text-xs space-y-1" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
            <p className="font-semibold" style={{ color: 'var(--info-text)' }}>Administrators only</p>
            <p style={{ color: 'var(--text-2)' }}>Students and supervisors are added directly by an admin — they do not register here.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <span style={{ color: 'var(--danger-text)' }} className="shrink-0 mt-0.5">✕</span>
              <p className="text-sm" style={{ color: 'var(--danger-text)' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" autoComplete="name" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@university.edu" autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-14" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-blue-500 transition" tabIndex={-1}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: i <= strength ? strengthColor : 'var(--border)' }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type={showPw ? 'text' : 'password'} className="input" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat your password" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={state === 'submitting'} className="btn-primary w-full py-3">
              {state === 'submitting' ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>

          <p className="text-center text-sm pt-4" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400 transition">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
