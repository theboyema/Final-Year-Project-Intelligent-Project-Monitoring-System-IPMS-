"use client";
import React, { useState, useRef } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import { addAudit } from '../../../lib/store';

type ParsedRow = {
  name: string; email: string; studentId: string; indexNumber: string;
  department: string; course: string; level: string; phone: string;
  password: string;
  status: 'ok' | 'error' | 'duplicate';
  error?: string;
};

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line =>
    line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
  );
}

const EXPECTED_HEADERS = ['name', 'email', 'studentid', 'indexnumber', 'department', 'course', 'level', 'phone'];

export default function BulkUploadPage() {
  const { getAllUsers, createStudent, user: adminUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows]             = useState<ParsedRow[]>([]);
  const [fileName, setFileName]     = useState('');
  const [parsed, setParsed]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [done, setDone]             = useState<{ success: number; failed: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(null);
    setParseError(null);
    setParsed(false);
    setRows([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const lines = parseCSV(text);
        if (lines.length < 2) { setParseError('CSV must have a header row and at least one data row.'); return; }

        const headers = lines[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
        const missing = EXPECTED_HEADERS.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setParseError(`Missing columns: ${missing.join(', ')}. Required: name, email, studentId, indexNumber, department, course, level, phone.`);
          return;
        }

        const idx = (col: string) => headers.indexOf(col);
        const existing = getAllUsers();
        const existingEmails = new Set(existing.map(u => u.email.toLowerCase()));
        const existingIds    = new Set(existing.map(u => u.studentId).filter(Boolean));
        const seenEmails     = new Set<string>();

        const parsed: ParsedRow[] = lines.slice(1).filter(r => r.some(c => c)).map(r => {
          const name        = r[idx('name')] || '';
          const email       = (r[idx('email')] || '').toLowerCase();
          const studentId   = r[idx('studentid')] || '';
          const indexNumber = r[idx('indexnumber')] || '';
          const department  = r[idx('department')] || '';
          const course      = r[idx('course')] || '';
          const level       = r[idx('level')] || '';
          const phone       = r[idx('phone')] || '';
          const password    = genPassword();

          if (!name || !email) return { name, email, studentId, indexNumber, department, course, level, phone, password, status: 'error' as const, error: 'Name and email are required.' };
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { name, email, studentId, indexNumber, department, course, level, phone, password, status: 'error' as const, error: 'Invalid email address.' };
          if (existingEmails.has(email) || seenEmails.has(email)) return { name, email, studentId, indexNumber, department, course, level, phone, password, status: 'duplicate' as const, error: 'Duplicate email.' };
          if (studentId && existingIds.has(studentId)) return { name, email, studentId, indexNumber, department, course, level, phone, password, status: 'duplicate' as const, error: 'Duplicate Student ID.' };

          seenEmails.add(email);
          return { name, email, studentId, indexNumber, department, course, level, phone, password, status: 'ok' as const };
        });

        setRows(parsed);
        setParsed(true);
      } catch {
        setParseError('Failed to parse CSV. Ensure the file is valid comma-separated.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const toImport = rows.filter(r => r.status === 'ok');
    if (toImport.length === 0) return;
    setUploading(true);
    let success = 0; let failed = 0;
    for (const row of toImport) {
      try {
        await createStudent({ name: row.name, email: row.email, password: row.password, studentId: row.studentId, indexNumber: row.indexNumber, department: row.department, course: row.course, level: row.level, phone: row.phone, mustChangePassword: true, status: 'ACTIVE' });
        success++;
      } catch { failed++; }
    }
    await addAudit({ userId: adminUser?.id || 'admin', userName: adminUser?.name || 'Administrator', action: 'BULK_UPLOAD', details: `Bulk imported ${success} students (${failed} failed) from ${fileName}` });
    setDone({ success, failed });
    setUploading(false);
    setParsed(false);
    setRows([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const okCount  = rows.filter(r => r.status === 'ok').length;
  const errCount = rows.filter(r => r.status === 'error' || r.status === 'duplicate').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Bulk Upload Students</h1>
        <p className="text-sm text-slate-500 mt-1">Import multiple student accounts from a CSV file. Passwords are auto-generated and students must change them on first login.</p>
      </div>

      {done && (
        <div className="rounded-2xl border-2 border-green-400 bg-green-50 px-5 py-4">
          <p className="font-bold text-green-800">Import complete!</p>
          <p className="text-sm text-green-700 mt-1">{done.success} student{done.success !== 1 ? 's' : ''} created. {done.failed > 0 && `${done.failed} failed.`}</p>
        </div>
      )}

      {/* CSV format guide */}
      <div className="card p-6 space-y-3">
        <h2 className="font-black text-slate-900">CSV Format</h2>
        <p className="text-sm text-slate-500">Your file must have these columns (in any order):</p>
        <div className="overflow-x-auto rounded-xl border-2 border-slate-900 bg-slate-50">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-200">
                {['name', 'email', 'studentId', 'indexNumber', 'department', 'course', 'level', 'phone'].map(h => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['John Doe', 'john@uni.edu', 'STU001', '00100001', 'CS', 'BSc CS', '400', '+233...'].map((v, i) => (
                  <td key={i} className="px-3 py-2 text-slate-600">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">Passwords are auto-generated. Students will be required to change their password on first login.</p>
      </div>

      {/* Upload area */}
      <div className="card p-6">
        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition">
          <div className="text-3xl">📂</div>
          <div className="text-center">
            <p className="font-bold text-slate-700">{fileName || 'Click to choose a CSV file'}</p>
            <p className="text-xs text-slate-400 mt-1">.csv files only</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>
        {parseError && <div className="mt-4 rounded-2xl bg-red-50 border-2 border-red-300 px-4 py-3 text-sm text-red-700">{parseError}</div>}
      </div>

      {/* Preview */}
      {parsed && rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-3">
              <span className="rounded-full border-2 border-green-400 bg-green-50 px-3 py-1 text-xs font-bold text-green-800">✓ {okCount} ready</span>
              {errCount > 0 && <span className="rounded-full border-2 border-red-400 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">✗ {errCount} issues</span>}
            </div>
            <button onClick={handleImport} disabled={uploading || okCount === 0} className="btn-primary text-sm px-6 py-2.5 disabled:opacity-50">
              {uploading ? 'Importing…' : `Import ${okCount} Student${okCount !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50 text-left font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Dept / Course</th>
                  <th className="px-4 py-3">Gen. Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.status === 'ok' ? 'bg-white' : 'bg-red-50'}>
                    <td className="px-4 py-2.5">
                      {r.status === 'ok'
                        ? <span className="rounded-full bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 font-bold">Ready</span>
                        : <span className="rounded-full bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 font-bold" title={r.error}>{r.status === 'duplicate' ? 'Dup.' : 'Error'}</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.email || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.studentId || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{[r.department, r.course, r.level ? `L${r.level}` : ''].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{r.status === 'ok' ? r.password : <span className="text-red-500 italic">{r.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 text-center">Generated passwords are shown above. Share them with students securely — they must be changed on first login.</p>
        </div>
      )}
    </div>
  );
}
