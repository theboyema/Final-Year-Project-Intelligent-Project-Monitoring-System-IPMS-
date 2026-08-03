"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/auth/auth-context';
import { subscribeStudentSubmissions, STAGES, STAGE_LABELS, fmtDate, type Submission } from '../../../lib/store';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  APPROVED:          { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  REVISION_REQUIRED: { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  },
};

export default function StudentProjectsPage() {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs] = useState<Submission[]>([]);

  const allUsers    = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user?.id) as any;
  const supervisor  = allUsers.find(u => u.id === currentUser?.supervisorId) as any;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeStudentSubmissions(user.id, setSubs);
    return () => unsub();
  }, [user?.id]);

  const latestForStage = (s: typeof STAGES[number]) =>
    subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version)[0];

  const approvedCount = STAGES.filter(s => latestForStage(s)?.status === 'APPROVED').length;
  const progressPct   = Math.round((approvedCount / STAGES.length) * 100);

  const totalSubmissions = subs.length;
  const pending   = subs.filter(s => s.status === 'PENDING').length;
  const approved  = subs.filter(s => s.status === 'APPROVED').length;
  const revision  = subs.filter(s => s.status === 'REVISION_REQUIRED').length;

  // Current active stage index
  let currentStageIdx = STAGES.findIndex(s => {
    const l = latestForStage(s);
    return !l || l.status !== 'APPROVED';
  });
  if (currentStageIdx < 0) currentStageIdx = STAGES.length;

  const projectComplete = approvedCount === STAGES.length;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--info-text)' }}>Projects</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>My Project</h1>
        <p className="text-sm text-slate-500 mt-1">Track your capstone project progress through all submission stages.</p>
      </div>

      {/* Project card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
              {currentUser?.projectTitle || 'Capstone Research Project'}
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {supervisor
                ? <span className="text-sm" style={{ color: 'var(--text-2)' }}>Supervisor: <span className="font-medium" style={{ color: 'var(--text-1)' }}>{supervisor.name}</span></span>
                : <span className="text-sm font-medium" style={{ color: 'var(--warning-text)' }}>No supervisor assigned</span>}
              {currentUser?.department && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{currentUser.department}</span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
            style={projectComplete
              ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
              : { background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }
            }>
            {projectComplete ? 'Complete' : 'In Progress'}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Overall Progress</span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>{progressPct}% — {approvedCount}/{STAGES.length} stages</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: projectComplete ? '#10b981' : 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: totalSubmissions, accent: '#3b82f6' },
            { label: 'Pending',  value: pending,          accent: '#f59e0b' },
            { label: 'Approved', value: approved,         accent: '#10b981' },
            { label: 'Revision', value: revision,         accent: '#ef4444' },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-surface-2)', border: `1px solid ${c.accent}33` }}>
              <div className="text-xl font-bold" style={{ color: c.accent }}>{c.value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/student/submissions" className="btn-primary text-sm flex-1 text-center">
            Submit Document
          </Link>
          <Link href="/student/submissions" className="btn-secondary text-sm flex-1 text-center">
            View History
          </Link>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="card p-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--info-text)' }}>Stage Breakdown</h3>
        <div className="space-y-4">
          {STAGES.map((s, i) => {
            const latest  = latestForStage(s);
            const status  = latest?.status ?? 'NOT_STARTED';
            const stageSubs = subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version);
            const isCurrent = i === currentStageIdx;
            const isLocked  = i > currentStageIdx && !latest;

            return (
              <div key={s} className="rounded-xl p-4" style={{
                background: isCurrent ? 'rgba(37,99,235,0.07)' : 'var(--bg-surface-2)',
                border: isCurrent ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                opacity: isLocked ? 0.45 : 1,
              }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={status === 'APPROVED'          ? { background: 'var(--success-bg)', color: 'var(--success-text)' }
                        : status === 'REVISION_REQUIRED'   ? { background: 'var(--danger-bg)',  color: 'var(--danger-text)'  }
                        : status === 'PENDING'             ? { background: 'var(--warning-bg)', color: 'var(--warning-text)' }
                        : isCurrent                        ? { background: 'var(--info-bg)',    color: 'var(--info-text)'    }
                        :                                    { background: 'var(--hover-bg)',   color: 'var(--text-3)'       }
                      }>
                      {status === 'APPROVED' ? '✓' : status === 'REVISION_REQUIRED' ? '!' : status === 'PENDING' ? '…' : i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{STAGE_LABELS[s]}</p>
                      {latest && <p className="text-xs text-slate-500 mt-0.5">v{latest.version} · {fmtDate(latest.createdAt)}</p>}
                      {isCurrent && !latest && <p className="text-xs mt-0.5" style={{ color: 'var(--info-text)' }}>Current stage</p>}
                      {isLocked && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Locked until previous stage approved</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stageSubs.length > 1 && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{stageSubs.length} versions</span>
                    )}
                    {latest
                      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={STATUS_STYLE[latest.status]}>
                          {latest.status === 'PENDING' ? 'Under Review' : latest.status === 'APPROVED' ? 'Approved' : 'Revision Needed'}
                        </span>
                      : <span className="text-xs" style={{ color: 'var(--text-3)' }}>Not started</span>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
