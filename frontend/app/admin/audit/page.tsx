"use client";
import React, { useState, useEffect } from 'react';
import { getAuditLog, fmtDateTime, type AuditEntry } from '../../../lib/store';

const ACTION_COLOR: Record<string, string> = {
  DOCUMENT_UPLOADED:   'bg-sky-100 text-sky-800',
  DOCUMENT_DOWNLOADED: 'bg-slate-100 text-slate-700',
  SUBMISSION_REVIEWED: 'bg-green-100 text-green-800',
  MESSAGE_SENT:        'bg-purple-100 text-purple-800',
  LOGIN:               'bg-yellow-100 text-yellow-800',
};

export default function AuditLogPage() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAuditLog().then(setLog);
  }, []);

  const filtered = filter
    ? log.filter(e => e.action.includes(filter) || e.userName.toLowerCase().includes(filter.toLowerCase()) || e.details.toLowerCase().includes(filter.toLowerCase()))
    : log;

  const actions = Array.from(new Set(log.map(e => e.action)));

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
        <p className="text-sm text-slate-500 mt-1">Complete record of all system actions — uploads, reviews, messages, logins.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => setFilter('')} className={`rounded-full border-2 border-slate-900 px-3 py-1.5 text-xs font-bold transition shadow-[2px_2px_0_rgba(15,23,42,1)] ${!filter ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>
          All ({log.length})
        </button>
        {actions.map(a => (
          <button key={a} onClick={() => setFilter(a)} className={`rounded-full border-2 border-slate-900 px-3 py-1.5 text-xs font-bold transition shadow-[2px_2px_0_rgba(15,23,42,1)] ${filter === a ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>
            {a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No audit entries yet. Activity will appear here as users interact with the system.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left text-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-50">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{e.userName}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ACTION_COLOR[e.action] ?? 'bg-slate-100 text-slate-700'}`}>
                      {e.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs max-w-sm">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
