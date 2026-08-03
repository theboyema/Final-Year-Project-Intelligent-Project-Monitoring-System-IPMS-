"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User, type UserStatus } from '../../../components/auth/auth-context';
import { addAudit } from '../../../lib/store';
import { DEPARTMENTS, ALL_COURSES } from '../../../lib/knust-programmes';

type Modal = 'create' | 'edit' | 'delete' | null;

const STATUS_BADGE: Record<UserStatus, { label: string; style: React.CSSProperties }> = {
  ACTIVE:      { label: 'Active',      style: { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' } },
  INACTIVE:    { label: 'Inactive',    style: { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' } },
  DEACTIVATED: { label: 'Deactivated', style: { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  } },
};

const SURFACE = 'var(--input-bg)';
const BORDER  = 'var(--input-border)';

function DarkInput({ value, onChange, placeholder, type = 'text', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${className}`}
      style={{ color: 'var(--text-1)', background: SURFACE, border: `1px solid ${BORDER}` }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
      onBlur={e  => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function DarkSelect({ value, onChange, children, className = '' }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${className}`}
      style={{ color: 'var(--text-1)', background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      {children}
    </select>
  );
}

export default function ManageStudentsPage() {
  const { getAllUsers, getSupervisors, createStudent, updateUser, deleteUser, assignSupervisor, sendLoginLink, user: adminUser } = useAuth();
  const [students, setStudents]     = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | UserStatus>('');
  const [modal, setModal]           = useState<Modal>(null);
  const [selected, setSelected]     = useState<User | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; email: string; password: string; emailSent: boolean } | null>(null);

  const blank = { name: '', email: '', password: '', studentId: '', indexNumber: '', department: '', course: '', level: '', phone: '', status: 'ACTIVE' as UserStatus };
  const [createForm, setCreateForm] = useState(blank);
  const [editForm, setEditForm]     = useState<Partial<User>>({});

  const refresh = useCallback(() => {
    const all = getAllUsers();
    setStudents(all.filter(u => u.role === 'STUDENT'));
    setSupervisors(getSupervisors());
  }, [getAllUsers, getSupervisors]);

  useEffect(() => { refresh(); }, [refresh]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const departments = Array.from(new Set(students.map(s => s.department).filter(Boolean))) as string[];
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q) || (s.indexNumber || '').toLowerCase().includes(q))
      && (!filterDept   || s.department === filterDept)
      && (!filterStatus || s.status === filterStatus);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!createForm.name || !createForm.email || !createForm.password) return setError('Name, email and password are required.');
    if (createForm.password.length < 6) return setError('Password must be at least 6 characters.');
    try {
      const { emailSent } = await createStudent({ ...createForm, mustChangePassword: true });
      await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'STUDENT_CREATED', details: `Created student: ${createForm.name} (${createForm.email})` });
      setCreatedInfo({ name: createForm.name, email: createForm.email, password: createForm.password, emailSent });
    } catch (err: any) { setError(err?.message || 'Failed to create student.'); }
  };

  const handleSendEmail = async (email: string) => {
    try {
      await sendLoginLink(email);
      showToast('Login setup email sent to ' + email);
    } catch {
      showToast('Failed to send email — check the address.');
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copied!`));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!selected) return;
    try {
      await updateUser(selected.id, editForm);
      await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'USER_UPDATED', details: `Updated student: ${editForm.name || selected.name}` });
      setModal(null); showToast('Student updated.');
    } catch (err: any) { setError(err?.message || 'Failed to update.'); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteUser(selected.id);
    await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'USER_DELETED', details: `Deleted student: ${selected.name} (${selected.email})` });
    setModal(null); showToast(`"${selected.name}" deleted.`);
  };

  const handleToggleStatus = async (s: User) => {
    const next: UserStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updateUser(s.id, { status: next });
    await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'USER_STATUS_CHANGED', details: `${next === 'ACTIVE' ? 'Activated' : 'Deactivated'} student: ${s.name}` });
    showToast(`${s.name} is now ${next}.`);
  };

  const S = { background: SURFACE, border: `1px solid ${BORDER}`, color: 'var(--text-1)' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--info-text)' }}>Account Management</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Manage Students</h1>
          <p className="text-sm text-slate-500 mt-1">Create, edit, and manage student accounts across all programmes.</p>
        </div>
        <button onClick={() => { setCreateForm(blank); setError(null); setModal('create'); }} className="btn-primary">
          + Add Student
        </button>
      </div>

      {toast && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }}>
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total',      value: students.length,                                   accent: '#3b82f6' },
          { label: 'Active',     value: students.filter(s => s.status === 'ACTIVE').length, accent: '#10b981' },
          { label: 'Inactive',   value: students.filter(s => s.status !== 'ACTIVE').length, accent: '#f59e0b' },
          { label: 'Unassigned', value: students.filter(s => !s.supervisorId).length,        accent: '#ef4444' },
        ].map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-3" style={{ borderTop: `2px solid ${c.accent}22` }}>
            <div className="text-2xl font-bold text-slate-100">{c.value}</div>
            <div className="text-xs text-slate-500 font-medium">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, ID…"
          className="rounded-xl px-4 py-2.5 text-sm outline-none flex-1 min-w-0 max-w-xs"
          style={S}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
          onBlur={e  => e.currentTarget.style.borderColor = BORDER}
        />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="rounded-xl px-4 py-2.5 text-sm outline-none" style={S}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as '' | UserStatus)} className="rounded-xl px-4 py-2.5 text-sm outline-none" style={S}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        {(search || filterDept || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); }} className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition px-2">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-400">{students.length === 0 ? 'No students yet' : 'No results'}</p>
            <p className="text-xs text-slate-600 mt-1">{students.length === 0 ? 'Add a student to get started.' : 'Try adjusting your search or filters.'}</p>
            {students.length === 0 && (
              <button onClick={() => { setCreateForm(blank); setError(null); setModal('create'); }} className="btn-primary mt-4 text-sm">
                Add First Student
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Student', 'Login Access', 'Ref No. / Index', 'Dept / Programme', 'Supervisor', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const sup = supervisors.find(sv => sv.id === s.supervisorId);
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.INACTIVE;
                return (
                  <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{s.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleSendEmail(s.email)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                        style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}
                      >Send Email</button>
                      {s.mustChangePassword && <div className="text-[10px] font-semibold mt-1" style={{ color: '#f59e0b' }}>Must change</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs" style={{ color: 'var(--text-2)' }}>{s.studentId || '—'}</div>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.indexNumber || ''}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-2)' }}>
                      <div>{s.department || '—'}</div>
                      <div style={{ color: 'var(--text-3)' }}>{s.course ? `${s.course}${s.level ? ` · L${s.level}` : ''}` : ''}</div>
                    </td>
                    <td className="px-5 py-3.5 min-w-[160px]">
                      {supervisors.length === 0
                        ? <span className="text-xs text-slate-600">No supervisors</span>
                        : <select value={s.supervisorId || ''} onChange={async e => { try { await assignSupervisor(s.id, e.target.value, undefined); } catch (err: any) { showToast('Failed to assign supervisor: ' + (err?.message || 'Try again')); } }}
                            className="rounded-lg px-2 py-1.5 text-xs outline-none w-full" style={S}
                          >
                            <option value="">Unassigned</option>
                            {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                          </select>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={badge.style}>{badge.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setSelected(s); setEditForm({ name: s.name, email: s.email, studentId: s.studentId, indexNumber: s.indexNumber, department: s.department, course: s.course, level: s.level, phone: s.phone, status: s.status }); setError(null); setModal('edit'); }}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold transition" style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}
                        >Edit</button>
                        <button onClick={() => handleToggleStatus(s)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                          style={s.status === 'ACTIVE'
                            ? { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }
                            : { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
                          }
                        >{s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => { setSelected(s); setModal('delete'); }}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold transition" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-xl rounded-2xl p-8 my-auto space-y-5" style={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

            {/* ── Success screen (after creation) ───────────────────────────── */}
            {createdInfo ? (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>✓</div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Student Created</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Share these credentials with <strong style={{ color: 'var(--text-2)' }}>{createdInfo.name}</strong>. They log in with the temporary password and will be prompted to set a permanent one.
                  </p>
                  {createdInfo.emailSent ? (
                    <p className="text-xs mt-1" style={{ color: '#10b981' }}>
                      A password-setup email was sent. <strong>Tell them to check their Spam / Junk folder</strong> — Firebase emails often land there. The link expires in 1 hour.
                    </p>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>Email could not be sent automatically. Share the temporary password below, then use "Resend Email" to try again — or have them log in with the temp password and change it on first login.</p>
                  )}
                </div>
                <div className="rounded-xl p-4 space-y-3 text-left" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Email</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm flex-1 font-mono break-all" style={{ color: 'var(--text-1)' }}>{createdInfo.email}</code>
                      <button onClick={() => copy(createdInfo.email, 'Email')}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                        style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}
                      >Copy</button>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm flex-1 font-mono tracking-widest" style={{ color: '#fbbf24' }}>{createdInfo.password}</code>
                      <button onClick={() => copy(createdInfo.password, 'Password')}
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                        style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}
                      >Copy</button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => handleSendEmail(createdInfo.email)}
                    className="btn-secondary flex-1 text-sm"
                  >Also send email link</button>
                  <button onClick={() => { setModal(null); setCreatedInfo(null); showToast(`Student "${createdInfo.name}" created.`); }}
                    className="btn-primary flex-1"
                  >Done</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{modal === 'create' ? 'Add Student' : 'Edit Student'}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{modal === 'create' ? 'A temporary password is set — share it with the student.' : selected?.email}</p>
                  </div>
                  <button onClick={() => { setCreatedInfo(null); setModal(null); }} className="transition text-lg leading-none" style={{ color: 'var(--text-3)' }}>✕</button>
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>{error}</div>
                )}

                <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Full Name *</label>
                      <DarkInput value={modal === 'create' ? createForm.name : (editForm.name || '')} onChange={v => modal === 'create' ? setCreateForm({ ...createForm, name: v }) : setEditForm({ ...editForm, name: v })} placeholder="Full name" />
                    </div>
                    <div>
                      <label className="label">Email *</label>
                      <DarkInput type="email" value={modal === 'create' ? createForm.email : (editForm.email || '')} onChange={v => modal === 'create' ? setCreateForm({ ...createForm, email: v }) : setEditForm({ ...editForm, email: v })} placeholder="student@uni.edu" />
                    </div>
                    {modal === 'create' && (
                      <div className="sm:col-span-2">
                        <label className="label">Password *</label>
                        <div className="flex gap-2">
                          <DarkInput value={createForm.password} onChange={v => setCreateForm({ ...createForm, password: v })} placeholder="Min. 6 characters" className="flex-1" />
                          <button type="button" onClick={() => setCreateForm({ ...createForm, password: genPassword() })}
                            className="rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition" style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}>
                            Generate
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="label">Reference Number <span className="normal-case font-normal text-slate-600">(8 digits)</span></label>
                      <DarkInput value={modal === 'create' ? createForm.studentId : (editForm.studentId || '')} onChange={v => { const n = v.replace(/\D/g, '').slice(0, 8); modal === 'create' ? setCreateForm({ ...createForm, studentId: n }) : setEditForm({ ...editForm, studentId: n }); }} placeholder="12345678" />
                    </div>
                    <div>
                      <label className="label">Index Number <span className="normal-case font-normal text-slate-600">(7 digits)</span></label>
                      <DarkInput value={modal === 'create' ? createForm.indexNumber : (editForm.indexNumber || '')} onChange={v => { const n = v.replace(/\D/g, '').slice(0, 7); modal === 'create' ? setCreateForm({ ...createForm, indexNumber: n }) : setEditForm({ ...editForm, indexNumber: n }); }} placeholder="1234567" />
                    </div>
                    <div>
                      <label className="label">Department / Faculty</label>
                      <DarkSelect
                        value={modal === 'create' ? createForm.department : (editForm.department || '')}
                        onChange={v => modal === 'create'
                          ? setCreateForm({ ...createForm, department: v, course: '' })
                          : setEditForm({ ...editForm, department: v, course: '' })}
                      >
                        <option value="">Select department…</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </DarkSelect>
                    </div>
                    <div>
                      <label className="label">Level / Year</label>
                      <DarkInput value={modal === 'create' ? createForm.level : (editForm.level || '')} onChange={v => modal === 'create' ? setCreateForm({ ...createForm, level: v }) : setEditForm({ ...editForm, level: v })} placeholder="e.g. 100, 200, 300, 400" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <DarkInput value={modal === 'create' ? createForm.phone : (editForm.phone || '')} onChange={v => modal === 'create' ? setCreateForm({ ...createForm, phone: v }) : setEditForm({ ...editForm, phone: v })} placeholder="+233 XX XXX XXXX" />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <DarkSelect value={modal === 'create' ? createForm.status : (editForm.status || 'ACTIVE')} onChange={v => modal === 'create' ? setCreateForm({ ...createForm, status: v as UserStatus }) : setEditForm({ ...editForm, status: v as UserStatus })}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        {modal === 'edit' && <option value="DEACTIVATED">Deactivated</option>}
                      </DarkSelect>
                    </div>
                  </div>
                  <div>
                    <label className="label">Programme / Course</label>
                    <DarkSelect
                      value={modal === 'create' ? createForm.course : (editForm.course || '')}
                      onChange={v => modal === 'create' ? setCreateForm({ ...createForm, course: v }) : setEditForm({ ...editForm, course: v })}
                    >
                      <option value="">Select programme…</option>
                      {ALL_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </DarkSelect>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setCreatedInfo(null); setModal(null); }} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" className="btn-primary flex-1">{modal === 'create' ? 'Create Student' : 'Save Changes'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: 'var(--modal-surface)', border: '1px solid var(--danger-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: 'var(--danger-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>Delete Student?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>This will permanently remove <strong style={{ color: 'var(--text-1)' }}>{selected.name}</strong> and all their data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
