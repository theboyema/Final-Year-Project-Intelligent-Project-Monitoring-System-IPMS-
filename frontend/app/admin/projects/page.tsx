"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import { getSubmissions, STAGES, STAGE_LABELS, fmtDate, type Submission } from '../../../lib/store';

export default function AdminProjectsPage() {
  const { getAllUsers } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);

  const allUsers    = getAllUsers();
  const students    = allUsers.filter(u => u.role === 'STUDENT');
  const supervisors = allUsers.filter(u => u.role === 'SUPERVISOR');

  useEffect(() => {
    getSubmissions().then(s => { setSubmissions(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const studentProgress = students.map(s => {
    const subs = submissions.filter(x => x.studentId === s.id);
    const approvedStages = STAGES.filter(st =>
      subs.filter(x => x.stage === st).sort((a, b) => b.version - a.version)[0]?.status === 'APPROVED'
    );
    const latestSub  = [...subs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const hasPending  = subs.some(x => x.status === 'PENDING');
    const hasRevision = subs.some(x => x.status === 'REVISION_REQUIRED');
    const supervisor  = supervisors.find(sv => sv.id === (s as any).supervisorId);
    return { student: s, approvedStages, latestSub, hasPending, hasRevision, supervisor, totalSubs: subs.length };
  });

  const total         = studentProgress.length;
  const completed     = studentProgress.filter(p => p.approvedStages.length === STAGES.length).length;
  const active        = studentProgress.filter(p => p.totalSubs > 0 && p.approvedStages.length < STAGES.length).length;
  const needsRevision = studentProgress.filter(p => p.hasRevision).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--info-text)' }}>Admin</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Project Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Monitor all capstone projects and their progress across every stage.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Projects',  value: total,         accent: '#3b82f6' },
          { label: 'Active',          value: active,        accent: '#f59e0b' },
          { label: 'Completed',       value: completed,     accent: '#10b981' },
          { label: 'Needs Revision',  value: needsRevision, accent: '#ef4444' },
        ].map(c => (
          <div key={c.label} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl font-bold"
              style={{ background: `${c.accent}18`, color: c.accent }}>{c.value}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading projects…</div>
      ) : studentProgress.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>No students yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Student', 'Supervisor', 'Progress', 'Current Stage', 'Last Activity', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentProgress.map(({ student, approvedStages, latestSub, hasPending, hasRevision, supervisor }) => {
                const pct = Math.round((approvedStages.length / STAGES.length) * 100);
                const currentStage = STAGES.find(st => {
                  const latest = submissions
                    .filter(x => x.studentId === student.id && x.stage === st)
                    .sort((a, b) => b.version - a.version)[0];
                  return !latest || latest.status !== 'APPROVED';
                }) ?? STAGES[STAGES.length - 1];

                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium" style={{ color: 'var(--text-1)' }}>{student.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{(student as any).studentId || student.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: supervisor ? 'var(--text-2)' : 'var(--warning-text)' }}>
                      {supervisor ? supervisor.name : 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                        </div>
                        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-2)' }}>{pct}%</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{approvedStages.length}/{STAGES.length} stages</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-2)' }}>
                      {STAGE_LABELS[currentStage]}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-3)' }}>
                      {latestSub ? fmtDate(latestSub.createdAt) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {approvedStages.length === STAGES.length
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>Completed</span>
                        : hasRevision
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>Revision</span>
                          : hasPending
                            ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }}>Pending</span>
                            : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--hover-bg)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                                {approvedStages.length === 0 ? 'Not Started' : 'In Progress'}
                              </span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
