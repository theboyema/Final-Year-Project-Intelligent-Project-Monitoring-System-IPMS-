"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth/auth-context';
import { useSidebar } from './SidebarContext';
import {
  subscribeNotifications, subscribeUnreadMsgCount,
  markNotificationRead, markAllRead,
  fmtDate, type Notification,
} from '../../lib/store';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [open, setOpen]         = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setNotifs([]); setUnreadMsg(0); return; }
    const unsubNotifs = subscribeNotifications(user.id, n => setNotifs(n.slice(0, 8)));
    const unsubMsg    = subscribeUnreadMsgCount(user.id, setUnreadMsg);
    return () => { unsubNotifs(); unsubMsg(); };
  }, [user?.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;
  const msgLink = user?.role === 'STUDENT' ? '/student/messages' : user?.role === 'SUPERVISOR' ? '/supervisor/messages' : '/admin';

  return (
    <header className="sticky top-0 z-20 w-full" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--nav-border)' }}>
      <div className="flex items-center justify-between gap-4 px-5 py-3">

        {/* Left */}
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg transition" style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link href="/" className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: '#3b82f6' }}>IP</span>MS
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              {/* Messages */}
              <Link href={msgLink} className="relative flex h-8 w-8 items-center justify-center rounded-lg transition" title="Messages"
                style={{ color: '#475569' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadMsg > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: '#ef4444' }}>
                    {unreadMsg > 9 ? '9+' : unreadMsg}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <div className="relative" ref={dropRef}>
                <button onClick={() => setOpen(p => !p)} className="relative flex h-8 w-8 items-center justify-center rounded-lg transition" title="Notifications"
                  style={{ color: open ? '#93c5fd' : '#475569', background: open ? 'rgba(59,130,246,0.12)' : 'transparent' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: '#3b82f6' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 top-10 w-72 rounded-2xl overflow-hidden z-50" style={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', boxShadow: '0 4px 24px var(--shadow)' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={async () => { if (user) await markAllRead(user.id); }} className="text-xs font-semibold transition" style={{ color: 'var(--info-text)' }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.length === 0
                        ? <p className="py-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No notifications yet.</p>
                        : notifs.map(n => (
                            <button key={n.id} onClick={async () => { await markNotificationRead(n.id); setOpen(false); }}
                              className="w-full text-left px-4 py-3 transition"
                              style={{ borderBottom: '1px solid var(--border)', background: !n.read ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                            >
                              <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>{n.title}</p>
                              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-2)' }}>{n.message}</p>
                              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{fmtDate(n.createdAt)}</p>
                            </button>
                          ))
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

              {/* User chip */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate" style={{ color: 'var(--text-2)' }}>{user.name}</span>
              </div>

              <button onClick={logout} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fca5a5'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
