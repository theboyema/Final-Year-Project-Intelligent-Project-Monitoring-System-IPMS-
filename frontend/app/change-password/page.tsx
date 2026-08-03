"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth/auth-context';

export default function ChangePasswordPage() {
  const { user, hydrated, changePassword, logout } = useAuth();

  const [form, setForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { window.location.href = '/login'; return; }
    if (!user.mustChangePassword) {
      const path = user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/supervisor' : '/student';
      window.location.href = path;
    }
  }, [user, hydrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.current)               return setError('Please enter your current password.');
    if (form.newPw.length < 8)       return setError('New password must be at least 8 characters.');
    if (form.newPw !== form.confirm) return setError('Passwords do not match.');
    if (form.newPw === form.current) return setError('New password must differ from your current one.');
    if (!user) return;
    setLoading(true);
    try {
      await changePassword(user.id, form.current, form.newPw);
      const dest = user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/supervisor' : '/student';
      window.location.href = dest;
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else {
        setError(err?.message || 'Failed to change password.');
      }
      setLoading(false);
    }
  };

  if (!hydrated || !user) return null;

  const BORDER = 'var(--input-border)';
  const S = { color: 'var(--text-1)', background: 'var(--input-bg)', border: `1px solid ${BORDER}` };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>

      <div className="w-full max-w-md relative z-10">
        <div className="card rounded-2xl p-8 space-y-6">

          {/* Badge */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: '#fcd34d' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Set Your Password</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                Welcome, <span className="font-medium" style={{ color: 'var(--text-1)' }}>{user.name}</span>. Your account was created by an administrator — please set a new password to continue.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Current (Temporary) Password', key: 'current', placeholder: 'The password you used to log in' },
              { label: 'New Password',                 key: 'newPw',   placeholder: 'At least 8 characters' },
              { label: 'Confirm New Password',         key: 'confirm', placeholder: 'Repeat your new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  type="password"
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  style={S}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={logout} className="btn-secondary flex-1">Log Out</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving…' : 'Set Password'}
              </button>
            </div>
          </form>

          <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
            Password must be at least 8 characters and different from your temporary one.
          </p>
        </div>
      </div>
    </div>
  );
}
