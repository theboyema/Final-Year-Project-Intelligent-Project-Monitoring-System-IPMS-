"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import { useTheme } from '../../../lib/theme-context';
import { addAudit, subscribeSupervisorSubmissions, type Submission } from '../../../lib/store';

type Tab = 'profile' | 'security' | 'appearance';

export default function SupervisorSettingsPage() {
  const { user, getAllUsers, updateUser, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [profile, setProfile] = useState({ name: '', phone: '', staffId: '', department: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [subs, setSubs] = useState<Submission[]>([]);

  const allUsers = getAllUsers();
  const fullUser = allUsers.find(u => u.id === user?.id);
  const myStudents = allUsers.filter(u => (u as any).supervisorId === user?.id);
  const pendingCount = subs.filter(s => s.status === 'PENDING').length;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeSupervisorSubmissions(user.id, setSubs);
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (fullUser) {
      setProfile({
        name:       fullUser.name || '',
        phone:      fullUser.phone || '',
        staffId:    fullUser.staffId || '',
        department: fullUser.department || '',
      });
    }
  }, [user?.id]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile.name.trim()) return showToast('Name is required.', 'err');
    setSavingProfile(true);
    try {
      updateUser(user.id, { name: profile.name.trim(), phone: profile.phone, staffId: profile.staffId, department: profile.department });
      await addAudit({ userId: user.id, userName: user.name, action: 'PROFILE_UPDATED', details: 'Supervisor updated their profile.' });
      showToast('Profile saved successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save.', 'err');
    } finally {
      setSavingProfile(false);
    }
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
      await addAudit({ userId: user.id, userName: user.name, action: 'PASSWORD_CHANGED', details: 'Supervisor changed their password.' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      showToast('Password changed successfully.');
    } catch (err: any) {
      const code = (err as any)?.code ?? '';
      const msg = (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        ? 'Current password is incorrect.'
        : err?.message || 'Failed to change password.';
      showToast(msg, 'err');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl font-bold text-green-800 shrink-0">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">{user?.name}</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="badge-green">Supervisor</span>
            {fullUser?.staffId && <span className="badge-gray text-xs">Staff ID: {fullUser.staffId}</span>}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200" style={{ borderColor: 'var(--border)' }}>
        {(['profile', 'security', 'appearance'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-3 text-sm font-medium transition-all capitalize"
            style={tab === t
              ? { color: 'var(--info-text)', borderBottom: '2px solid var(--info-text)', marginBottom: -1 }
              : { color: 'var(--text-3)', borderBottom: '2px solid transparent', marginBottom: -1 }
            }>
            {t === 'profile' ? 'Profile' : t === 'security' ? 'Security' : 'Appearance'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-5">Profile Information</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full Name <span className="text-red-400">*</span></label>
                <input className="input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+233 XX XXX XXXX" />
              </div>
              <div>
                <label className="label">Staff ID</label>
                <input className="input" value={profile.staffId} onChange={e => setProfile({ ...profile, staffId: e.target.value })} placeholder="e.g. LEC001" />
              </div>
              <div>
                <label className="label">Department</label>
                <input className="input" value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} placeholder="e.g. Computer Science" />
              </div>
            </div>
            <div className="pt-1">
              <button type="submit" disabled={savingProfile} className="btn-primary">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-5">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} placeholder="Current password" />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} placeholder="Minimum 8 characters" />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Repeat new password" />
            </div>
            <div className="pt-1">
              <button type="submit" disabled={savingPw} className="btn-primary">
                {savingPw ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-5">Display</h2>
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium text-slate-900">Theme</p>
              <p className="text-xs text-slate-500 mt-0.5">{theme === 'dark' ? 'Dark' : 'Light'}</p>
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
