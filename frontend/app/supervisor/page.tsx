"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/auth/auth-context';
import {
  subscribeSupervisorSubmissions, subscribeNotifications,
  subscribeUnreadMsgCount, subscribeUnreadCount,
  markAllRead, STAGE_LABELS, fmtDate,
  type Submission, type Notification,
} from '../../lib/store';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  APPROVED:          { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  REVISION_REQUIRED: { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  },
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REVISION_REQUIRED: 'Revision',
};

export default function SupervisorDashboard() {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs]           = useState<Submission[]>([]);
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const allUsers   = getAllUsers();
  const myStudents = allUsers.filter(u => (u as any).supervisorId === user?.id);

  useEffect(() => {
    if (!user) return;
    const unsubSubs     = subscribeSupervisorSubmissions(user.id, setSubs);
    const unsubNotifs   = subscribeNotifications(user.id, setNotifs);
    const unsubMsg      = subscribeUnreadMsgCount(user.id, setUnreadMsg);
    const unsubUnread   = subscribeUnreadCount(user.id, setUnreadNotifs);
    return () => { unsubSubs(); unsubNotifs(); unsubMsg(); unsubUnread(); };
  }, [user?.id]);

  const pendingSubs  = subs.filter(s => s.status === 'PENDING');

  const studentLatest = myStudents.map(s => {
    const studentSubs = subs.filter(x => x.studentId === s.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { student: s, latest: studentSubs[0] };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--info-text)' }}>Supervisor</p>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Welcome back, {user?.name?.split(' ')[0] ?? 'Supervisor'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {myStudents.length} assigned student{myStudents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/supervisor/students" className="btn-primary text-xs px-4 py-2">My Students</Link>
          <Link href="/supervisor/messages" className="btn-secondary text-xs px-4 py-2 relative">
            Messages
            {unreadMsg > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#ef4444' }}>{unreadMsg}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Assigned Students',    value: myStudents.length,  accent: '#3b82f6', href: '/supervisor/students',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
          { label: 'Pending Reviews',      value: pendingSubs.length, accent: '#f59e0b', href: '/supervisor/students',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg> },
          { label: 'Total Submissions',    value: subs.length,        accent: '#8b5cf6', href: '/supervisor/students',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
          { label: 'Unread Notifications', value: unreadNotifs,       accent: '#ef4444', href: '/supervisor/messages',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg> },
        ].map(s => (
          <Link key={s.label} href={s.href} className="card p-3 sm:p-5 flex items-center gap-3 group transition-all duration-200 hover:scale-[1.01]"
            style={{ borderTop: `2px solid ${s.accent}22` }}>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
              style={{ background: `${s.accent}14`, color: s.accent }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{s.value}</div>
              <div className="text-[10px] sm:text-xs font-medium mt-0.5 leading-tight" style={{ color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">

          {/* Pending reviews */}
          {pendingSubs.length > 0 && (
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
                Pending Reviews ({pendingSubs.length})
              </p>
              <div className="space-y-2">
                {pendingSubs.slice(0, 6).map(sub => {
                  const student = allUsers.find(u => u.id === sub.studentId);
                  return (
                    <div key={sub.id} className="flex items-center justify-between gap-3 rounded-xl p-3"
                      style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{sub.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {student?.name} · {STAGE_LABELS[sub.stage]} v{sub.version} · {fmtDate(sub.createdAt)}
                        </p>
                      </div>
                      <Link href={`/supervisor/students/${sub.studentId}`} className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
                        Review →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assigned students */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>My Students</p>
              <Link href="/supervisor/students" className="text-xs font-semibold transition" style={{ color: 'var(--info-text)' }}>See all →</Link>
            </div>
            {myStudents.length === 0
              ? <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>No students assigned to you yet.</p>
              : <div className="space-y-2">
                  {studentLatest.map(({ student, latest }) => {
                    const s = student as any;
                    return (
                      <Link key={s.id} href={`/supervisor/students/${s.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl p-3 transition-all duration-150 group"
                        style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-2)'; }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                            {s.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{s.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.course ?? '—'}{s.level ? ` · L${s.level}` : ''}</p>
                          </div>
                        </div>
                        {latest
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0" style={STATUS_STYLE[latest.status]}>
                              {STATUS_LABEL[latest.status]}
                            </span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                              style={{ background: 'var(--neutral-bg)', color: 'var(--neutral-text)', border: '1px solid var(--neutral-border)' }}>
                              No submissions
                            </span>
                        }
                      </Link>
                    );
                  })}
                </div>
            }
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Notifications</p>
            {unreadNotifs > 0 && (
              <button onClick={async () => { if (user) await markAllRead(user.id); }}
                className="text-xs font-semibold transition" style={{ color: 'var(--info-text)' }}>
                Mark all read
              </button>
            )}
          </div>
          {notifs.length === 0
            ? <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No notifications yet.</p>
              </div>
            : <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 flex-1">
                {notifs.map(n => (
                  <div key={n.id}
                    className="rounded-xl p-3 transition"
                    style={n.read
                      ? { background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }
                      : { background: 'rgba(37,99,235,0.06)', border: '1px solid var(--border-accent)' }
                    }>
                    <p className="text-sm font-semibold" style={{ color: n.read ? 'var(--text-2)' : 'var(--text-1)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{n.message}</p>
                    {n.link && (
                      <Link href={n.link} className="text-xs font-semibold mt-1 block transition" style={{ color: 'var(--info-text)' }}>
                        Open →
                      </Link>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{fmtDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
          }
          <Link href="/supervisor/messages" className="btn-secondary w-full text-center mt-4 text-sm">
            Open Messages
            {unreadMsg > 0 && (
              <span className="ml-2 rounded-full text-white text-xs px-1.5 py-0.5 font-bold"
                style={{ background: '#ef4444' }}>{unreadMsg}</span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
