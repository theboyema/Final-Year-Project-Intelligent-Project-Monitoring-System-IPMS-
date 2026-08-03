"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/auth/auth-context';
import { subscribeSupervisorSubmissions, STAGE_LABELS, STAGES, fmtDate, type Submission } from '../../../lib/store';

const STATUS_BADGE: Record<string, React.ReactNode> = {
  PENDING:           <span className="badge-yellow">🟡 Pending</span>,
  APPROVED:          <span className="badge-green">🟢 Approved</span>,
  REVISION_REQUIRED: <span className="badge-red">🔴 Revision</span>,
};

export default function SupervisorStudentsPage() {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs] = useState<Submission[]>([]);

  const allUsers = getAllUsers();
  const myStudents = allUsers.filter(u => (u as any).supervisorId === user?.id);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeSupervisorSubmissions(user.id, setSubs);
    return () => unsub();
  }, [user?.id]);

  const studentProgress = myStudents.map(s => {
    const studentSubs = subs.filter(x => x.studentId === s.id);
    const pendingCount = studentSubs.filter(x => x.status === 'PENDING').length;
    const approvedStages = STAGES.filter(stage => {
      const latest = studentSubs.filter(x => x.stage === stage).sort((a, b) => b.version - a.version)[0];
      return latest?.status === 'APPROVED';
    }).length;
    const latestSub = [...studentSubs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { student: s as any, pendingCount, approvedStages, latestSub, totalSubs: studentSubs.length };
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-slate-900">My Students</h2>
        <p className="text-sm text-slate-500 mt-1">{myStudents.length} student{myStudents.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {myStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-bold text-slate-700">No students assigned yet</p>
          <p className="text-sm text-slate-400 mt-1">Students will appear here once an administrator assigns them to you.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentProgress.map(({ student, pendingCount, approvedStages, latestSub, totalSubs }) => (
            <Link
              key={student.id}
              href={`/supervisor/students/${student.id}`}
              className="card p-5 space-y-4 block hover:shadow-[4px_4px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {/* Student header */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border-2 border-slate-900 bg-sky-200 flex items-center justify-center text-lg font-black text-sky-900">
                  {student.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{student.name}</p>
                  <p className="text-xs text-slate-400 truncate">{student.email}</p>
                </div>
                {pendingCount > 0 && (
                  <span className="shrink-0 w-6 h-6 rounded-full bg-yellow-300 border-2 border-slate-900 flex items-center justify-center text-xs font-black">{pendingCount}</span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-1 text-xs text-slate-500">
                {student.course && <p>📚 {student.course}{student.level ? ` · Level ${student.level}` : ''}</p>}
                {student.studentId && <p>🆔 {student.studentId}</p>}
              </div>

              {/* Stage progress bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>Progress</span><span>{approvedStages}/{STAGES.length} stages</span>
                </div>
                <div className="flex gap-1">
                  {STAGES.map((s, i) => (
                    <div key={s} className={`flex-1 h-2 rounded-full border border-slate-900 ${i < approvedStages ? 'bg-green-400' : 'bg-slate-200'}`} title={STAGE_LABELS[s]} />
                  ))}
                </div>
              </div>

              {/* Latest submission */}
              {latestSub ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700 truncate">{latestSub.title}</p>
                    {STATUS_BADGE[latestSub.status]}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{STAGE_LABELS[latestSub.stage]} · v{latestSub.version} · {fmtDate(latestSub.createdAt)}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No submissions yet</p>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                <span>{totalSubs} submission{totalSubs !== 1 ? 's' : ''} total</span>
                <span className="font-bold text-sky-600">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
