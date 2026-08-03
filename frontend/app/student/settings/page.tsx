"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import { useTheme } from '../../../lib/theme-context';
import { addAudit } from '../../../lib/store';
import { DEPARTMENTS, ALL_COURSES } from '../../../lib/knust-programmes';

type Tab = 'profile' | 'security' | 'appearance';

export default function StudentSettingsPage() {
  const { user, getAllUsers, updateUser, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [profile, setProfile] = useState({ name: '', phone: '', course: '', level: '', studentId: '', indexNumber: '', department: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const allUsers = getAllUsers();
  const fullUser = allUsers.find(u => u.id === user?.id);
  const supervisor = allUsers.find(u => u.id === (fullUser as any)?.supervisorId);

  useEffect(() => {
    if (fullUser) {
      setProfile({ name: fullUser.name || '', phone: fullUser.phone || '', course: fullUser.course || '', level: fullUser.level || '', studentId: fullUser.studentId || '', indexNumber: fullUser.indexNumber || '', department: fullUser.department || '' });
    }
  }, [user?.id]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile.name.trim()) return showToast('Name is required.', 'err');
    setSavingProfile(true);
    try {
      updateUser(user.id, { name: profile.name.trim(), phone: profile.phone, course: profile.course, level: profile.level, studentId: profile.studentId, indexNumber: profile.indexNumber, department: profile.department });
      await addAudit({ userId: user.id, userName: user.name, action: 'PROFILE_UPDATED', details: 'Student updated their profile.' });
      showToast('Profile saved successfully.');
    } catch (err: any) { showToast(err?.message || 'Failed to save profile.', 'err'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pwForm.current) return showToast('Enter your current password.', 'err');
    if (pwForm.newPw.length < 8) return showToast('New password must be at least 8 characters.', 'err');
    if (pwForm.newPw !== pwForm.confirm) return showToast('Passwords do not match.', 'err');
    setSavingPw(true);
    try {
      await changePassword(user.id, pwForm.current, pwForm.newPw);
      await addAudit({ userId: user.id, userName: user.name, action: 'PASSWORD_CHANGED', details: 'Student changed their password.' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      showToast('Password changed successfully.');
    } catch (err: any) {
      const code = (err as any)?.code ?? '';
      const msg = (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        ? 'Current password is incorrect.'
        : err?.message || 'Failed to change password.';
      showToast(msg, 'err');
    } finally { setSavingPw(false); }
  };

  const BORDER = 'var(--input-border)';
  const S = { color: 'var(--text-1)', background: 'var(--input-bg)', border: `1px solid ${BORDER}` };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Settings</h1>
      </div>

      {toast && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={toast.type === 'ok'
            ? { background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }
            : { background: 'var(--danger-bg)',  border: '1px solid var(--danger-border)',  color: 'var(--danger-text)' }
          }
        >{toast.msg}</div>
      )}

      {/* Account summary */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <span className="badge-blue">Student</span>
              {fullUser?.studentId && <span className="badge-gray">Ref: {fullUser.studentId}</span>}
              {supervisor && <span className="badge-green">Supervisor: {supervisor.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['profile', 'security', 'appearance'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-3 text-sm font-medium transition-all capitalize"
            style={tab === t
              ? { color: 'var(--info-text)', borderBottom: '2px solid var(--info-text)', marginBottom: -1 }
              : { color: 'var(--text-3)', borderBottom: '2px solid transparent', marginBottom: -1 }
            }
          >
            {t === 'profile' ? 'Profile' : t === 'security' ? 'Security' : 'Appearance'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-2)' }}>Profile Information</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name *',      key: 'name',        placeholder: 'Your full name',           maxLen: 0 },
                { label: 'Phone Number',     key: 'phone',       placeholder: '+233 XX XXX XXXX',         maxLen: 0 },
                { label: 'Reference Number', key: 'studentId',   placeholder: '8-digit reference number', maxLen: 8 },
                { label: 'Index Number',     key: 'indexNumber', placeholder: '7-digit index number',     maxLen: 7 },
                { label: 'Level / Year',     key: 'level',       placeholder: 'e.g. 100, 200, 300, 400',  maxLen: 0 },
              ].map(f => (
                <div key={f.key}>
                  <label className="label">
                    {f.label}
                    {f.maxLen > 0 && <span className="normal-case font-normal text-slate-600 ml-1">({f.maxLen} digits)</span>}
                  </label>
                  <input
                    value={(profile as any)[f.key]}
                    onChange={e => {
                      let v = e.target.value;
                      if (f.maxLen > 0) v = v.replace(/\D/g, '').slice(0, f.maxLen);
                      setProfile({ ...profile, [f.key]: v });
                    }}
                    inputMode={f.maxLen > 0 ? 'numeric' : 'text'}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    style={S}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                    onBlur={e  => e.currentTarget.style.borderColor = BORDER}
                  />
                </div>
              ))}

              {/* Department — dropdown */}
              <div>
                <label className="label">Department / Faculty</label>
                <select
                  value={profile.department}
                  onChange={e => setProfile({ ...profile, department: e.target.value, course: '' })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  style={S}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                  onBlur={e  => e.currentTarget.style.borderColor = BORDER}
                >
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Programme / Course of Study</label>
              <select
                value={profile.course}
                onChange={e => setProfile({ ...profile, course: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={S}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor = BORDER}
              >
                <option value="">Select programme…</option>
                {ALL_COURSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={savingProfile} className="btn-primary">
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-2)' }}>Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'Current Password',     key: 'current', placeholder: 'Enter your current password' },
              { label: 'New Password',         key: 'newPw',   placeholder: 'At least 8 characters' },
              { label: 'Confirm New Password', key: 'confirm', placeholder: 'Repeat new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input type="password" value={(pwForm as any)[f.key]} onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={S}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                  onBlur={e  => e.currentTarget.style.borderColor = BORDER}
                />
              </div>
            ))}
            <div className="pt-2">
              <button type="submit" disabled={savingPw} className="btn-primary">
                {savingPw ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-2)' }}>Display</h2>
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Theme</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{theme === 'dark' ? 'Dark' : 'Light'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none shrink-0"
              style={{ background: theme === 'dark' ? '#2563eb' : '#d1d5db' }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
