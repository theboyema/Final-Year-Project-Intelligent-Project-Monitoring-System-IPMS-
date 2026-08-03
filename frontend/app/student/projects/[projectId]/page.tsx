"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../components/auth/auth-context';
import {
  subscribeStudentSubmissions, getReviewForSubmission, addAudit,
  STAGES, STAGE_LABELS, fmtDate, fmtFileSize, downloadFile,
  type Submission, type Review,
} from '../../../../lib/store';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  APPROVED:          { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  REVISION_REQUIRED: { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  },
};

export default function StudentProjectDetailPage() {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [activeStage, setActiveStage] = useState<typeof STAGES[number]>('PROPOSAL');

  const allUsers    = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user?.id) as any;
  const supervisor  = allUsers.find(u => u.id === currentUser?.supervisorId) as any;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeStudentSubmissions(user.id, setSubs);
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (!subs.length) return;
    Promise.all(subs.map(s => getReviewForSubmission(s.id))).then(results => {
      const map: Record<string, Review> = {};
      results.forEach((r, i) => { if (r) map[subs[i].id] = r; });
      setReviews(map);
    });
  }, [subs]);

  const latestForStage = (s: typeof STAGES[number]) =>
    subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version)[0];

  const byStage = (s: typeof STAGES[number]) =>
    subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version);

  const approvedCount = STAGES.filter(s => latestForStage(s)?.status === 'APPROVED').length;
  const progressPct   = Math.round((approvedCount / STAGES.length) * 100);

  const download = (sub: Submission) => {
    downloadFile(sub.fileUrl, sub.fileName);
    addAudit({ userId: user!.id, userName: user!.name, action: 'DOCUMENT_DOWNLOADED', details: `Downloaded "${sub.fileName}"` });
  };

  const activeVersions = byStage(activeStage);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/student/projects" className="text-xs text-slate-500 hover:text-blue-500 transition flex items-center gap-1 mb-2">
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            {currentUser?.projectTitle || 'Capstone Research Project'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {supervisor
              ? <>Supervisor: <span className="font-medium" style={{ color: 'var(--text-1)' }}>{supervisor.name}</span></>
              : <span style={{ color: 'var(--warning-text)' }}>No supervisor assigned</span>}
            {currentUser?.course && <span className="ml-3" style={{ color: 'var(--text-3)' }}>{currentUser.course}</span>}
          </p>
        </div>
        <Link href="/student/submissions" className="btn-primary text-sm">Submit Document</Link>
      </div>

      {/* Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--info-text)' }}>Project Progress</h3>
          <span className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>{approvedCount}/{STAGES.length} stages approved</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--bg-surface-2)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STAGES.map((s, i) => {
            const latest   = latestForStage(s);
            const status   = latest?.status;
            const isActive = s === activeStage;
            return (
              <button key={s} onClick={() => setActiveStage(s)}
                className="flex-1 min-w-[80px] rounded-xl px-3 py-2.5 text-xs font-medium transition-all"
                style={isActive
                  ? { background: 'rgba(37,99,235,0.12)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }
                  : { background: 'var(--bg-surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                }>
                <div className="font-bold mb-1">{i + 1}</div>
                <div className="leading-tight">{STAGE_LABELS[s]}</div>
                {status && (
                  <div className="mt-1.5 text-[10px] font-semibold"
                    style={{ color: status === 'APPROVED' ? 'var(--success-text)' : status === 'REVISION_REQUIRED' ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                    {status === 'APPROVED' ? '✓ Done' : status === 'REVISION_REQUIRED' ? '! Revision' : '… Review'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage detail */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{STAGE_LABELS[activeStage]}</h3>
          {activeVersions.length > 0 && (
            <span className="text-xs text-slate-500">{activeVersions.length} submission{activeVersions.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {activeVersions.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(59,130,246,0.08)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No submissions for this stage yet</p>
            <Link href="/student/submissions" className="btn-primary mt-4 text-sm inline-flex">Submit Now</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeVersions.map((sub, i) => {
              const review   = reviews[sub.id];
              const isLatest = i === 0;
              return (
                <div key={sub.id} className="rounded-xl p-4 space-y-3"
                  style={isLatest
                    ? { background: 'rgba(37,99,235,0.06)', border: '1px solid var(--border-accent)' }
                    : { background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }
                  }>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--hover-bg)', color: 'var(--text-2)' }}>v{sub.version}</span>
                        {isLatest && <span className="text-xs font-semibold" style={{ color: 'var(--info-text)' }}>Latest</span>}
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{sub.title}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{sub.fileName} · {fmtFileSize(sub.fileSize)} · {fmtDate(sub.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={STATUS_STYLE[sub.status]}>
                        {sub.status === 'PENDING' ? 'Under Review' : sub.status === 'APPROVED' ? 'Approved' : 'Revision Required'}
                      </span>
                      <button onClick={() => download(sub)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                        style={{ background: 'var(--hover-bg)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                        ↓ Download
                      </button>
                    </div>
                  </div>

                  {review && (
                    <div className="rounded-lg p-3 space-y-1"
                      style={review.status === 'APPROVED'
                        ? { background: 'var(--success-bg)', border: '1px solid var(--success-border)' }
                        : { background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }
                      }>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Supervisor Feedback</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(review.reviewedAt)}</p>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>{review.remarks || 'No remarks provided.'}</p>
                    </div>
                  )}
                  {!review && sub.status === 'PENDING' && (
                    <p className="text-xs text-slate-600 italic">Waiting for supervisor review…</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Submissions',  value: subs.length,                                       accent: '#3b82f6' },
          { label: 'Approved',           value: subs.filter(s => s.status === 'APPROVED').length,   accent: '#10b981' },
          { label: 'Pending / Revision', value: subs.filter(s => s.status !== 'APPROVED').length,   accent: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-3" style={{ borderTop: `2px solid ${c.accent}33` }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{c.value}</div>
            <div className="text-xs text-slate-500 font-medium">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
