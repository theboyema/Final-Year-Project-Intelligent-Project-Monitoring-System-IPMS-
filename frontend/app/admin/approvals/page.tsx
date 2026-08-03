"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User } from '../../../components/auth/auth-context';
import { addAudit, fmtDateTime } from '../../../lib/store';

export default function AdminApprovalsPage() {
  const { getPendingAdmins, approveUser, rejectUser, user: adminUser } = useAuth();
  const [pending, setPending] = useState<User[]>([]);
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const refresh = useCallback(() => setPending(getPendingAdmins()), [getPendingAdmins]);
  useEffect(() => { refresh(); }, [refresh]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (u: User) => {
    await approveUser(u.id);
    await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'ADMIN_APPROVED', details: `Approved admin account for ${u.name} (${u.email})` });
    showToast(`${u.name}'s account has been approved.`);
  };

  const handleReject = async (u: User) => {
    if (!confirm(`Reject and delete the admin application from ${u.name} (${u.email})?`)) return;
    await rejectUser(u.id);
    await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'ADMIN_REJECTED', details: `Rejected admin application from ${u.name} (${u.email})` });
    showToast(`${u.name}'s application has been rejected.`, 'err');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--info-text)' }}>Admin Access</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve or reject pending administrator applications.</p>
        </div>
        {pending.length > 0 && (
          <div className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)' }}>
            {pending.length} pending
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold transition-all"
          style={toast.type === 'ok'
            ? { background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }
            : { background: 'var(--danger-bg)',  border: '1px solid var(--danger-border)',  color: 'var(--danger-text)'  }
          }
        >
          {toast.msg}
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl px-5 py-4" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--info-text)' }}>How admin approval works</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          When someone registers at <code className="rounded px-1" style={{ background: 'var(--hover-bg)', color: 'var(--info-text)' }}>/register</code>, their account is held pending until an existing admin approves it. You can also create admin accounts directly from Settings without requiring approval.
        </p>
      </div>

      {/* List */}
      {pending.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-300">All clear</h3>
          <p className="text-sm text-slate-600 mt-1">No pending applications. New requests appear when someone registers at <strong className="text-slate-500">/register</strong>.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(u => (
            <div key={u.id} className="card p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                  >
                    {u.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{u.name}</p>
                      <span className="badge-yellow">Pending</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{u.email}</p>
                    <p className="text-xs text-slate-700 mt-0.5">Applied {fmtDateTime(u.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReject(u)} className="btn-danger px-4 py-2 text-xs">
                    Reject
                  </button>
                  <button onClick={() => handleApprove(u)} className="btn-primary px-4 py-2 text-xs">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
