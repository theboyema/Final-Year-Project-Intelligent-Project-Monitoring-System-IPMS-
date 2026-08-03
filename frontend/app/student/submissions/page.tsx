"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../components/auth/auth-context';
import {
  subscribeStudentSubmissions, getReviewForSubmission,
  createSubmission, pushNotification, addAudit,
  STAGES, STAGE_LABELS, fmtDate, fmtDateTime, fmtFileSize, downloadFile, proxyUrl,
  type Submission, type SubmissionStage, type Review,
} from '../../../lib/store';

const SURFACE = 'var(--input-bg)';
const BORDER  = 'var(--input-border)';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING:           { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  APPROVED:          { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  REVISION_REQUIRED: { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  },
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending Review', APPROVED: 'Approved', REVISION_REQUIRED: 'Revision Required',
};

export default function StudentSubmissionsPage() {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs]           = useState<Submission[]>([]);
  const [reviews, setReviews]     = useState<Record<string, Review>>({});
  const [stage, setStage]         = useState<SubmissionStage>('PROPOSAL');
  const [title, setTitle]         = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [fileData, setFileData]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [preview, setPreview]     = useState<Submission | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allUsers    = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user?.id) as any;
  const supervisor  = allUsers.find(u => u.id === currentUser?.supervisorId) as any;

  // Real-time subscription for submissions
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeStudentSubmissions(user.id, setSubs);
    return () => unsub();
  }, [user?.id]);

  // Load reviews whenever the submission list changes
  useEffect(() => {
    if (!subs.length) return;
    Promise.all(subs.map(s => getReviewForSubmission(s.id))).then(results => {
      const map: Record<string, Review> = {};
      results.forEach((r, i) => { if (r) map[subs[i].id] = r; });
      setReviews(map);
    });
  }, [subs]);

  const byStage        = (s: SubmissionStage) => subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version);
  const latestForStage = (s: SubmissionStage) => byStage(s)[0];
  const canSubmit      = (s: SubmissionStage) => {
    const l = latestForStage(s);
    if (!l) return true;
    if (l.status === 'REVISION_REQUIRED') return true;
    // Supervisor was reassigned — old pending submission is orphaned; allow resubmission to new supervisor
    if (l.status === 'PENDING' && supervisor && l.supervisorId !== supervisor.id) return true;
    return false;
  };

  const reassignedStages = STAGES.filter(s => {
    const l = latestForStage(s);
    return l?.status === 'PENDING' && supervisor && l.supervisorId !== supervisor.id;
  });

  const progressIdx = () => {
    for (let i = 0; i < STAGES.length; i++) {
      const l = latestForStage(STAGES[i]);
      if (!l || l.status !== 'APPROVED') return i;
    }
    return STAGES.length;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File too large. Maximum 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setFile(f); setFileData(reader.result as string); };
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!title.trim())    return setError('Please enter a document title.');
    if (!fileData)        return setError('Please select a PDF or DOCX file.');
    if (!supervisor)      return setError('No supervisor assigned. Contact your administrator.');
    if (!canSubmit(stage)) return setError('This stage has been approved and cannot be resubmitted.');
    setUploading(true);
    try {
      const existing = byStage(stage);
      const version  = (existing[0]?.version ?? 0) + 1;
      const chainId  = existing[0]?.chainId ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));
      await createSubmission({
        chainId, studentId: user.id, supervisorId: supervisor.id,
        stage, title: title.trim(), fileName: file!.name, fileSize: file!.size,
        fileType: file!.type, fileData, version, status: 'PENDING',
      });
      await pushNotification({
        userId: supervisor.id, type: 'SUBMISSION',
        title: `New submission from ${user.name}`,
        message: `"${title.trim()}" — ${STAGE_LABELS[stage]} v${version}`,
        link: `/supervisor/students/${user.id}`,
      });
      await addAudit({ userId: user.id, userName: user.name, action: 'DOCUMENT_UPLOADED',
        details: `Uploaded "${title.trim()}" for ${STAGE_LABELS[stage]} (v${version})` });
      setTitle(''); setFile(null); setFileData('');
      if (fileRef.current) fileRef.current.value = '';
      setSuccess(`"${title.trim()}" submitted. Your supervisor has been notified.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const download = (sub: Submission) => {
    downloadFile(sub.fileUrl, sub.fileName);
    addAudit({ userId: user!.id, userName: user!.name, action: 'DOCUMENT_DOWNLOADED', details: `Downloaded "${sub.fileName}"` });
  };

  const idx = progressIdx();
  const S = { color: 'var(--text-1)', background: SURFACE, border: `1px solid ${BORDER}` };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#3b82f6' }}>Submissions</p>
        <h1 className="text-2xl font-bold text-slate-100">My Submissions</h1>
        {supervisor
          ? <p className="text-sm text-slate-500 mt-1">Supervisor: <span className="font-semibold text-slate-300">{supervisor.name}</span></p>
          : <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
              No supervisor assigned — contact your administrator
            </span>
        }
      </div>

      {/* Progress tracker */}
      <div className="card p-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#3b82f6' }}>Project Progress</h3>
        <div className="flex items-center overflow-x-auto gap-0 pb-2">
          {STAGES.map((s, i) => {
            const l        = latestForStage(s);
            const approved = l?.status === 'APPROVED';
            const revision = l?.status === 'REVISION_REQUIRED';
            const pending  = l?.status === 'PENDING';
            const current  = i === idx;
            return (
              <React.Fragment key={s}>
                <div className={`flex flex-col items-center gap-1.5 min-w-[72px] ${i > idx && !approved ? 'opacity-40' : ''}`}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={approved ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
                      : revision ? { background: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: '1px solid var(--danger-border)'  }
                      : pending  ? { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }
                      : current  ? { background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }
                      :            { background: 'var(--hover-bg)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                    }>
                    {approved ? '✓' : revision ? '!' : pending ? '…' : i + 1}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">{STAGE_LABELS[s]}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="flex-1 h-px min-w-[12px]" style={{ background: approved ? 'rgba(16,185,129,0.3)' : 'var(--border)' }} />
                )}
              </React.Fragment>
            );
          })}
          {idx >= STAGES.length && (
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
              All stages complete!
            </span>
          )}
        </div>
      </div>

      {/* Upload form */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-100 mb-5">Submit Document</h3>

        {reassignedStages.length > 0 && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
            Your supervisor has been updated to <strong>{supervisor?.name}</strong>. Please resubmit
            {reassignedStages.length === 1
              ? ` your ${STAGE_LABELS[reassignedStages[0]]} document`
              : ` the following stages: ${reassignedStages.map(s => STAGE_LABELS[s]).join(', ')}`}
            {' '}to your new supervisor.
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }}>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Stage</label>
              <select value={stage} onChange={e => { setStage(e.target.value as SubmissionStage); setError(null); }}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={S}>
                {STAGES.map(s => {
                  const l = latestForStage(s);
                  const locked = !canSubmit(s);
                  const label = locked
                    ? l?.status === 'APPROVED' ? ` — approved` : ` — pending review`
                    : '';
                  return (
                    <option key={s} value={s} disabled={locked}>
                      {STAGE_LABELS[s]}{label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">Document Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Research Proposal Draft 1"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={S}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor = BORDER}
              />
            </div>
          </div>

          <div>
            <label className="label">File — PDF or DOCX (max 5 MB)</label>
            <input ref={fileRef} type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFile}
              className="block w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              style={{ ...S, cursor: 'pointer' }}
            />
            {file && (
              <p className="mt-1.5 text-xs text-slate-500">{file.name} · {fmtFileSize(file.size)}</p>
            )}
          </div>

          <button type="submit" disabled={uploading || !canSubmit(stage)} className="btn-primary disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Submit Document'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-100 mb-5">Submission History</h3>
        {subs.length === 0
          ? <p className="text-sm text-slate-600 py-8 text-center">No submissions yet.</p>
          : <div className="space-y-8">
              {STAGES.map(s => {
                const ss = byStage(s);
                if (!ss.length) return null;
                return (
                  <div key={s}>
                    <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3b82f6' }}>{STAGE_LABELS[s]}</h4>
                    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                            {['Ver.', 'Title', 'File', 'Submitted', 'Status', 'Remarks', 'Reviewed', 'Actions'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ss.map((sub, i) => {
                            const review = reviews[sub.id];
                            return (
                              <tr key={sub.id}
                                style={{ borderBottom: i < ss.length - 1 ? '1px solid var(--border)' : 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              >
                                <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-2)' }}>v{sub.version}</td>
                                <td className="px-4 py-3 max-w-[150px]" style={{ color: 'var(--text-1)' }}><div className="truncate">{sub.title}</div></td>
                                <td className="px-4 py-3 max-w-[120px]">
                                  <div className="truncate text-xs" style={{ color: 'var(--text-2)' }}>{sub.fileName}</div>
                                  <div className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtFileSize(sub.fileSize)}</div>
                                </td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{fmtDate(sub.createdAt)}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={STATUS_STYLE[sub.status]}>
                                    {STATUS_LABEL[sub.status]}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[180px]">
                                  {review?.remarks
                                    ? <span style={{ color: 'var(--text-2)' }} className="line-clamp-2">{review.remarks}</span>
                                    : <span style={{ color: 'var(--text-3)' }}>No remarks yet</span>}
                                </td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{review ? fmtDate(review.reviewedAt) : '—'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    <button onClick={() => setPreview(sub)}
                                      className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                                      style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}>
                                      View
                                    </button>
                                    <button onClick={() => download(sub)}
                                      className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                                      style={{ background: 'var(--hover-bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                                      ↓
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-4xl mt-6 rounded-2xl overflow-hidden"
            style={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{preview.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{preview.fileName} · {STAGE_LABELS[preview.stage]} v{preview.version} · {fmtDateTime(preview.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => download(preview)} className="btn-secondary text-xs px-3 py-2">Download</button>
                <button onClick={() => setPreview(null)} className="btn-secondary text-xs px-3 py-2">✕ Close</button>
              </div>
            </div>
            <div className="p-4">
              {preview.fileType === 'application/pdf'
                ? <iframe src={proxyUrl(preview.fileUrl)} className="w-full rounded-xl" style={{ height: '70vh', border: '1px solid var(--border)' }} title="Preview" />
                : <div className="flex flex-col items-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-slate-300">DOCX preview unavailable</p>
                    <p className="text-sm text-slate-500 mt-1">Download the file to view it in Word.</p>
                    <button onClick={() => download(preview)} className="btn-primary mt-4">Download File</button>
                  </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
