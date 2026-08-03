"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import {
  subscribeMessages, sendMessage, markMessagesRead,
  pushNotification, addAudit, fmtTime, fmtDate, proxyUrl, type Message,
} from '../../../lib/store';

export default function StudentMessagesPage() {
  const { user, getAllUsers } = useAuth();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [draft, setDraft]         = useState('');
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const allUsers    = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user?.id) as any;
  const supervisor  = allUsers.find(u => u.id === currentUser?.supervisorId) as any;

  const userId = user?.id ?? '';
  const supId  = supervisor?.id ?? '';

  // Subscribe to conversation in real-time
  useEffect(() => {
    if (!userId || !supId) return;
    const unsub = subscribeMessages(userId, supId, msgs => {
      setMessages(msgs);
      // Mark incoming messages as read
      markMessagesRead(userId, supId);
    });
    return () => unsub();
  }, [userId, supId]);

  // Scroll to bottom when messages change
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { alert('File too large. Max 3 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: f.name, type: f.type, data: reader.result as string });
    reader.readAsDataURL(f);
  };

  const handleSend = async () => {
    if (!userId || !supId || (!draft.trim() && !attachment)) return;
    const content = draft.trim();
    setDraft(''); setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
    await sendMessage({ senderId: userId, receiverId: supId, content, ...(attachment ? { attachment } : {}) });
    await pushNotification({
      userId: supId, type: 'MESSAGE',
      title: `Message from ${user!.name}`,
      message: content || `Sent an attachment: ${attachment?.name}`,
      link: '/supervisor/messages',
    });
    await addAudit({ userId, userName: user!.name, action: 'MESSAGE_SENT', details: `Sent message to ${supervisor.name}` });
  };

  if (!supervisor) {
    return (
      <div className="card p-10 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(59,130,246,0.08)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-200">No supervisor assigned</h3>
        <p className="text-sm text-slate-500">You can only message your assigned supervisor. Contact your administrator to get one assigned.</p>
      </div>
    );
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const d = fmtDate(m.timestamp);
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(m); else grouped.push({ date: d, msgs: [m] });
  });

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 100px)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)', backdropFilter: 'blur(12px)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
          {supervisor.name[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{supervisor.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Your Supervisor{supervisor.department ? ` · ${supervisor.department}` : ''}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ background: 'var(--bg-surface-2)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-400">No messages yet</p>
            <p className="text-sm text-slate-600 mt-1">Start a conversation with {supervisor.name}.</p>
          </div>
        )}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex justify-center mb-3">
              <span className="rounded-full px-3 py-0.5 text-xs font-medium"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                {date}
              </span>
            </div>
            <div className="space-y-3">
              {msgs.map(m => {
                const isMine = m.senderId === user?.id;
                const senderName = isMine ? 'You' : (supervisor?.name ?? 'Supervisor');
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    <span className="text-[10px] font-semibold mb-1 px-1" style={{ color: isMine ? 'rgba(147,197,253,0.9)' : 'var(--text-3)' }}>
                      {senderName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                      {/* Avatar for the other party */}
                      {!isMine && (
                        <div className="w-7 h-7 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                          {supervisor?.name?.[0]?.toUpperCase() ?? 'S'}
                        </div>
                      )}
                      <div className="rounded-2xl px-4 py-2.5"
                        style={{
                          maxWidth: '70%',
                          background: isMine ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'var(--msg-other-bg)',
                          border: isMine ? 'none' : '1px solid var(--msg-other-border)',
                          borderBottomRightRadius: isMine ? 4 : undefined,
                          borderBottomLeftRadius:  isMine ? undefined : 4,
                        }}>
                        {m.content && <p className="text-sm leading-relaxed" style={{ color: isMine ? '#e0eaff' : 'var(--text-1)' }}>{m.content}</p>}
                        {m.attachment && (
                          <div className="mt-1.5">
                            {m.attachment.type.startsWith('image/') ? (
                              <img src={proxyUrl(m.attachment.data)} alt={m.attachment.name} className="max-w-full rounded-xl mt-1" style={{ maxHeight: 200, border: '1px solid rgba(255,255,255,0.08)' }} />
                            ) : (
                              <a href={proxyUrl(m.attachment.data)} download={m.attachment.name}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition mt-1"
                                style={{ background: 'rgba(0,0,0,0.12)', color: isMine ? '#bfdbfe' : 'var(--text-2)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                📎 {m.attachment.name}
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: isMine ? 'rgba(224,234,255,0.5)' : '#475569', textAlign: isMine ? 'right' : 'left' }}>
                          {fmtTime(m.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3" style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}>
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}>
            📎 {attachment.name}
            <button onClick={() => setAttachment(null)} className="ml-auto hover:text-red-400 transition">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{ color: 'var(--text-1)', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            placeholder={`Message ${supervisor.name}…`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
            onBlur={e  => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'}
          />
          <label className="rounded-xl px-3 py-2.5 cursor-pointer transition flex items-center"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
            title="Attach file">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
          </label>
          <button onClick={handleSend} disabled={!draft.trim() && !attachment} className="btn-primary px-5 disabled:opacity-40">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
