"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../components/auth/auth-context';
import {
  subscribeAllMessagesForUser, subscribeMessages,
  sendMessage, markMessagesRead,
  pushNotification, addAudit, fmtTime, fmtDate, proxyUrl,
  type Message,
} from '../../../lib/store';

type MsgWithParticipants = Message & { participants: string[] };

export default function SupervisorMessagesPage() {
  const { user, getAllUsers } = useAuth();
  const searchParams = useSearchParams();
  const [peerId, setPeerId]     = useState<string | null>(null);
  const [allMsgs, setAllMsgs]   = useState<MsgWithParticipants[]>([]);
  const [chatMsgs, setChatMsgs] = useState<Message[]>([]);
  const [draft, setDraft]       = useState('');
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const allUsers   = getAllUsers();
  const userId     = user?.id ?? '';
  const myStudents = allUsers.filter(u => (u as any).supervisorId === userId);

  // Subscribe to ALL messages for sidebar data (unread counts, last messages, peer list)
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeAllMessagesForUser(userId, setAllMsgs);
    return () => unsub();
  }, [userId]);

  // Derive peer list: students + anyone who has sent a message
  const msgPeerIds = Array.from(new Set(
    allMsgs.map(m => m.participants.find(p => p !== userId) ?? '').filter(Boolean)
  ));
  const peerIds = Array.from(new Set([...myStudents.map(s => s.id), ...msgPeerIds]));
  const peers   = peerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as any[];

  // Set initial peer from URL ?student= param or first available
  useEffect(() => {
    if (peerId) return;
    const paramId = searchParams.get('student');
    if (paramId && peerIds.includes(paramId)) { setPeerId(paramId); return; }
    if (peers.length > 0) setPeerId(peers[0].id);
  }, [peers.length, searchParams]);

  // Subscribe to the active conversation
  useEffect(() => {
    if (!userId || !peerId) return;
    const unsub = subscribeMessages(userId, peerId, msgs => {
      setChatMsgs(msgs);
      markMessagesRead(userId, peerId);
    });
    return () => unsub();
  }, [userId, peerId]);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const unreadFromPeer = (pid: string) =>
    allMsgs.filter(m => m.receiverId === userId && m.senderId === pid && !m.read).length;

  const lastMsgFrom = (pid: string) =>
    [...allMsgs].reverse().find(m => m.participants.includes(pid));

  const selectedPeer = peerId ? allUsers.find(u => u.id === peerId) as any : null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { alert('File too large. Max 3 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: f.name, type: f.type, data: reader.result as string });
    reader.readAsDataURL(f);
  };

  const handleSend = async () => {
    if (!user || !peerId || (!draft.trim() && !attachment)) return;
    const content = draft.trim();
    setDraft(''); setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
    await sendMessage({ senderId: user.id, receiverId: peerId, content, ...(attachment ? { attachment } : {}) });
    const peer = allUsers.find(u => u.id === peerId) as any;
    if (peer) await pushNotification({ userId: peerId, type: 'MESSAGE', title: `Message from ${user.name}`, message: content || `Sent an attachment: ${attachment?.name}`, link: '/student/messages' });
    await addAudit({ userId: user.id, userName: user.name, action: 'MESSAGE_SENT', details: `Sent message to ${peer?.name}` });
  };

  const grouped: { date: string; msgs: Message[] }[] = [];
  chatMsgs.forEach(m => {
    const d = fmtDate(m.timestamp);
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(m); else grouped.push({ date: d, msgs: [m] });
  });

  if (myStudents.length === 0) {
    return (
      <div className="card p-12 text-center space-y-3">
        <div className="text-5xl">💬</div>
        <h3 className="text-lg font-black text-slate-900">No students assigned</h3>
        <p className="text-sm text-slate-500">You will be able to message students once they are assigned to you by an administrator.</p>
      </div>
    );
  }

  return (
    <div className="card flex overflow-hidden" style={{ height: 'calc(100vh - 108px)' }}>
      {/* Sidebar — student list */}
      <div className="w-72 shrink-0 flex flex-col border-r-2 border-slate-900 bg-white">
        <div className="px-4 py-3.5 border-b-2 border-slate-900">
          <p className="font-black text-slate-900 text-sm">Messages</p>
          <p className="text-xs text-slate-400 mt-0.5">{peers.length} conversation{peers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {peers.map(p => {
            const unread  = unreadFromPeer(p.id);
            const lastMsg = lastMsgFrom(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setPeerId(p.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 transition ${peerId === p.id ? 'bg-sky-50 border-l-4 border-l-sky-500' : 'hover:bg-slate-50'}`}
              >
                <div className="w-10 h-10 shrink-0 rounded-full border-2 border-slate-900 bg-sky-200 flex items-center justify-center text-sm font-black text-sky-900">{p.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${unread > 0 ? 'font-black text-slate-900' : 'font-medium text-slate-700'}`}>{p.name}</p>
                  {lastMsg
                    ? <p className="text-xs text-slate-400 truncate">{lastMsg.content || '📎 Attachment'}</p>
                    : <p className="text-xs text-slate-300 italic">No messages yet</p>
                  }
                </div>
                {unread > 0 && <span className="shrink-0 w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      {!selectedPeer ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-black text-slate-700">Select a student</p>
          <p className="text-sm text-slate-400 mt-1">Choose a student from the list to start chatting.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b-2 border-slate-900 px-5 py-3.5 bg-white">
            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-sky-200 flex items-center justify-center font-black text-sky-900 text-sm">{selectedPeer.name[0]}</div>
            <div className="flex-1">
              <p className="font-black text-slate-900">{selectedPeer.name}</p>
              <p className="text-xs text-slate-400">{selectedPeer.email}{selectedPeer.course ? ` · ${selectedPeer.course}` : ''}</p>
            </div>
            <Link href={`/supervisor/students/${selectedPeer.id}`} className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap">
              View Submissions →
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50">
            {chatMsgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-3">👋</div>
                <p className="font-black text-slate-700">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">Start the conversation with {selectedPeer.name}.</p>
              </div>
            )}
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                <div className="flex justify-center mb-3">
                  <span className="rounded-full bg-slate-200 border border-slate-300 px-3 py-0.5 text-xs font-medium text-slate-500">{date}</span>
                </div>
                <div className="space-y-3">
                  {msgs.map(m => {
                    const isMine = m.senderId === user?.id;
                    const senderName = isMine ? 'You' : (selectedPeer?.name ?? 'Student');
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        <span className="text-[10px] font-semibold mb-1 px-1" style={{ color: isMine ? '#0284c7' : '#64748b' }}>
                          {senderName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                          {/* Avatar for the other party */}
                          {!isMine && (
                            <div className="w-7 h-7 shrink-0 rounded-full border-2 border-slate-900 bg-sky-200 flex items-center justify-center text-xs font-black text-sky-900">
                              {selectedPeer?.name?.[0] ?? '?'}
                            </div>
                          )}
                          <div className="rounded-2xl border-2 border-slate-900 px-4 py-2.5 shadow-[2px_2px_0_rgba(15,23,42,1)]"
                            style={{
                              maxWidth: '68%',
                              background: isMine ? '#7dd3fc' : '#ffffff',
                              borderBottomRightRadius: isMine ? 4 : undefined,
                              borderBottomLeftRadius:  isMine ? undefined : 4,
                            }}>
                            {m.content && <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                            {m.attachment && (
                              <div className="mt-1">
                                {m.attachment.type.startsWith('image/')
                                  ? <img src={proxyUrl(m.attachment.data)} alt={m.attachment.name} className="max-w-full rounded-xl border border-slate-300 mt-1" style={{ maxHeight: 200 }} />
                                  : <a href={proxyUrl(m.attachment.data)} download={m.attachment.name} className="flex items-center gap-2 rounded-xl bg-white/60 border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white transition mt-1">📎 {m.attachment.name}</a>
                                }
                              </div>
                            )}
                            <p className="text-[10px] mt-1" style={{ color: isMine ? '#0369a1' : '#94a3b8', textAlign: isMine ? 'right' : 'left' }}>{fmtTime(m.timestamp)}</p>
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

          {/* Input */}
          <div className="border-t-2 border-slate-900 bg-white px-4 py-3">
            {attachment && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs font-medium text-slate-700">
                📎 {attachment.name}
                <button onClick={() => setAttachment(null)} className="ml-auto text-slate-400 hover:text-red-500 transition">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="input flex-1 py-2.5"
                placeholder={`Message ${selectedPeer.name}…`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <label className="btn-secondary cursor-pointer px-3.5 py-2.5 text-base" title="Attach file">
                📎
                <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
              </label>
              <button onClick={handleSend} disabled={!draft.trim() && !attachment} className="btn-primary px-5 py-2.5 disabled:opacity-40">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
