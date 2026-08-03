"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User } from '../../../components/auth/auth-context';
import { addAudit } from '../../../lib/store';

export default function AssignSupervisorsPage() {
  const { getAllUsers, getSupervisors, assignSupervisor, user: adminUser } = useAuth();

  const [students, setStudents]     = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [search, setSearch]         = useState('');
  const [filterSup, setFilterSup]   = useState('');
  const [filterTab, setFilterTab]   = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [editing, setEditing]       = useState<Record<string, { supId: string; title: string }>>({});
  const [toast, setToast]           = useState<string | null>(null);

  const refresh = useCallback(() => {
    const all = getAllUsers();
    setStudents(all.filter(u => u.role === 'STUDENT'));
    setSupervisors(getSupervisors());
  }, [getAllUsers, getSupervisors]);

  useEffect(() => { refresh(); }, [refresh]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const startEdit = (s: User) => {
    setEditing(prev => ({ ...prev, [s.id]: { supId: s.supervisorId || '', title: s.projectTitle || '' } }));
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const saveAssignment = async (s: User) => {
    const e = editing[s.id];
    if (!e) return;
    const sup = supervisors.find(sv => sv.id === e.supId);
    await assignSupervisor(s.id, e.supId, e.title);
    await addAudit({
      userId: adminUser?.id || 'admin',
      userName: adminUser?.name || 'Administrator',
      action: 'SUPERVISOR_ASSIGNED',
      details: sup
        ? `Assigned ${sup.name} to ${s.name}${e.title ? ` — "${e.title}"` : ''}`
        : `Removed supervisor from ${s.name}`,
    });
    cancelEdit(s.id);
    showToast(sup ? `${s.name} assigned to ${sup.name}.` : `Supervisor removed from ${s.name}.`);
  };

  const unassignedCount = students.filter(s => !s.supervisorId).length;

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q);
    const matchSup    = !filterSup || s.supervisorId === filterSup;
    const matchTab    = filterTab === 'all' || (filterTab === 'unassigned' ? !s.supervisorId : !!s.supervisorId);
    return matchSearch && matchSup && matchTab;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Assign Supervisors</h1>
        <p className="text-sm text-slate-500 mt-1">Assign supervisors to students and optionally set a project title.</p>
      </div>

      {toast && <div className="rounded-2xl bg-green-50 border-2 border-green-400 px-4 py-3 text-sm font-bold text-green-800">{toast}</div>}

      {unassignedCount > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-900">{unassignedCount} student{unassignedCount !== 1 ? 's' : ''} without a supervisor</p>
            <p className="text-xs text-amber-700 mt-0.5">Assign supervisors below so students can submit documents.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Students',  value: students.length,                              color: 'bg-sky-100' },
          { label: 'Assigned',        value: students.filter(s => s.supervisorId).length,   color: 'bg-green-100' },
          { label: 'Unassigned',      value: unassignedCount,                              color: unassignedCount > 0 ? 'bg-red-100' : 'bg-slate-100' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border-2 border-slate-900 ${c.color} p-4 shadow-[3px_3px_0_rgba(15,23,42,1)]`}>
            <div className="text-2xl font-black text-slate-900">{c.value}</div>
            <div className="text-xs font-bold text-slate-600 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 rounded-2xl bg-slate-100 border-2 border-slate-900 p-1">
          {(['all', 'unassigned', 'assigned'] as const).map(t => (
            <button key={t} onClick={() => setFilterTab(t)}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold capitalize transition ${filterTab === t ? 'bg-white text-slate-900 border-2 border-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t} {t === 'unassigned' ? `(${unassignedCount})` : t === 'assigned' ? `(${students.length - unassignedCount})` : `(${students.length})`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} className="input max-w-xs text-sm" placeholder="Search student…" />
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)} className="input w-auto text-sm">
          <option value="">All supervisors</option>
          <option value="UNASSIGNED">Unassigned only</option>
          {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No students found.</div>
        ) : (
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Supervisor</th>
                <th className="px-5 py-3">Project Title</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const isEditing = !!editing[s.id];
                const e = editing[s.id];
                const currentSup = supervisors.find(sv => sv.id === s.supervisorId);
                return (
                  <tr key={s.id} className={`transition ${isEditing ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{s.studentId || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{s.course ? `${s.course}${s.level ? ` L${s.level}` : ''}` : '—'}</td>
                    <td className="px-5 py-3.5 min-w-[180px]">
                      {isEditing ? (
                        <select value={e.supId} onChange={ev => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], supId: ev.target.value } }))}
                          className="w-full rounded-xl border-2 border-sky-500 bg-white px-2 py-1 text-xs font-medium focus:outline-none">
                          <option value="">— Unassigned —</option>
                          {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                        </select>
                      ) : (
                        <span className={currentSup ? 'text-slate-700 font-medium text-xs' : 'text-red-500 text-xs font-bold'}>
                          {currentSup ? currentSup.name : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 min-w-[200px]">
                      {isEditing ? (
                        <input value={e.title} onChange={ev => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], title: ev.target.value } }))}
                          className="w-full rounded-xl border-2 border-sky-500 bg-white px-2 py-1 text-xs focus:outline-none" placeholder="Optional project title…" />
                      ) : (
                        <span className="text-xs text-slate-500">{s.projectTitle || <em className="text-slate-300">Not set</em>}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveAssignment(s)} className="rounded-lg border-2 border-sky-500 bg-sky-500 px-2.5 py-1 text-xs font-black text-white hover:bg-sky-600 transition">Save</button>
                          <button onClick={() => cancelEdit(s.id)} className="rounded-lg border-2 border-slate-300 px-2.5 py-1 text-xs font-bold hover:bg-slate-100 transition">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(s)} className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-bold hover:bg-slate-100 transition shadow-[1px_1px_0_rgba(15,23,42,1)]">
                          {currentSup ? 'Reassign' : 'Assign'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
