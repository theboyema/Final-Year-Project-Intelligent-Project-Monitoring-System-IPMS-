"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../components/auth/auth-context';
import {
  subscribeStudentSubmissions, getReviewForSubmission, saveReview,
  pushNotification, addAudit, STAGES, STAGE_LABELS,
  fmtDate, fmtDateTime, fmtFileSize, downloadFile, proxyUrl,
  type Submission, type SubmissionStatus, type Review,
} from '../../../../lib/store';

const STATUS_BADGE: Record<string, React.ReactNode> = {
  PENDING:           <span className="badge-yellow">Pending Review</span>,
  APPROVED:          <span className="badge-green">Approved</span>,
  REVISION_REQUIRED: <span className="badge-red">Revision Required</span>,
};

export default function StudentReviewPage({ params }: { params: { studentId: string } }) {
  const { user, getAllUsers } = useAuth();
  const [subs, setSubs]           = useState<Submission[]>([]);
  const [reviews, setReviews]     = useState<Record<string, Review>>({});
  const [selected, setSelected]   = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('PENDING');
  const [remarks, setRemarks]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);
  const [preview, setPreview]     = useState(false);

  const allUsers = getAllUsers();
  const student = allUsers.find(u => u.id === params.studentId) as any;

  // Real-time submission list
  useEffect(() => {
    const unsub = subscribeStudentSubmissions(params.studentId, setSubs);
    return () => unsub();
  }, [params.studentId]);

  // Reload reviews whenever the submission list changes
  useEffect(() => {
    if (!subs.length) return;
    Promise.all(subs.map(s => getReviewForSubmission(s.id))).then(results => {
      const map: Record<string, Review> = {};
      results.forEach((r, i) => { if (r) map[subs[i].id] = r; });
      setReviews(map);
    });
  }, [subs]);

  // Pre-populate review form when a submission is selected
  useEffect(() => {
    if (!selected) return;
    const existing = reviews[selected.id];
    if (existing) { setReviewStatus(existing.status); setRemarks(existing.remarks); }
    else { setReviewStatus('PENDING'); setRemarks(''); }
    setPreview(false);
  }, [selected?.id, reviews]);

  const byStage = (s: typeof STAGES[number]) =>
    subs.filter(x => x.stage === s).sort((a, b) => b.version - a.version);

  const handleSaveReview = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await saveReview({
        submissionId: selected.id,
        supervisorId: user.id,
        status: reviewStatus,
        remarks: remarks.trim(),
        reviewedAt: new Date().toISOString(),
      });

      await pushNotification({
        userId: selected.studentId,
        type: 'REVIEW',
        title: reviewStatus === 'APPROVED' ? 'Submission Approved!' : reviewStatus === 'REVISION_REQUIRED' ? 'Revision Required' : 'Review Updated',
        message: remarks.trim() || (reviewStatus === 'APPROVED' ? 'Your submission has been approved.' : 'Your supervisor has reviewed your submission.'),
        link: '/student/submissions',
      });

      await addAudit({
        userId: user.id,
        userName: user.name,
        action: 'SUBMISSION_REVIEWED',
        details: `Reviewed "${selected.title}" for ${student?.name} — Status: ${reviewStatus}`,
      });

      // Refresh the review for this submission
      const updated = await getReviewForSubmission(selected.id);
      if (updated) setReviews(prev => ({ ...prev, [selected.id]: updated }));

      setSaveMsg('Review saved successfully.');
      setTimeout(() => setSaveMsg(null), 3000);
    } finally { setSaving(false); }
  };

  const download = (sub: Submission) => downloadFile(sub.fileUrl, sub.fileName);

  if (!student) {
    return (
      <div className="card p-10 text-center">
        <p className="font-bold text-slate-700">Student not found.</p>
        <Link href="/supervisor/students" className="btn-secondary mt-4 inline-block">← Back to Students</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/supervisor/students" className="rounded-full border-2 border-slate-900 bg-slate-100 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 transition">← Back</Link>
            <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-sky-200 flex items-center justify-center text-xl font-black text-sky-900">
              {student.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
              <p className="text-sm text-slate-500">{student.email}{student.course ? ` · ${student.course}` : ''}{student.level ? ` · Level ${student.level}` : ''}</p>
            </div>
          </div>
          <Link href={`/supervisor/messages?student=${params.studentId}`} className="btn-secondary text-xs px-4 py-2">Message Student</Link>
        </div>
      </div>

      {/* Stage progress */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Stage Progress</h3>
        <div className="flex items-center overflow-x-auto gap-0 pb-1">
          {STAGES.map((s, i) => {
            const latest   = byStage(s)[0];
            const approved = latest?.status === 'APPROVED';
            const revision = latest?.status === 'REVISION_REQUIRED';
            const pending  = latest?.status === 'PENDING';
            return (
              <React.Fragment key={s}>
                <div className={`flex flex-col items-center gap-1 min-w-[80px] ${!latest ? 'opacity-40' : ''}`}>
                  <div className={`w-9 h-9 rounded-full border-2 border-slate-900 flex items-center justify-center text-sm font-bold shadow-[2px_2px_0_rgba(15,23,42,1)] ${approved ? 'bg-green-300' : revision ? 'bg-red-200' : pending ? 'bg-yellow-200' : 'bg-slate-100'}`}>
                    {approved ? '✓' : revision ? '!' : pending ? '⌛' : i + 1}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 text-center">{STAGE_LABELS[s]}</span>
                </div>
                {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 border-t-2 border-dashed min-w-4 ${approved ? 'border-green-400' : 'border-slate-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left — submission list */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Submissions</h3>
          {subs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No submissions yet from this student.</p>
          ) : (
            <div className="space-y-5">
              {STAGES.map(s => {
                const stageSubs = byStage(s);
                if (!stageSubs.length) return null;
                return (
                  <div key={s}>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{STAGE_LABELS[s]}</h4>
                    <div className="space-y-2">
                      {stageSubs.map(sub => {
                        const isSelected = selected?.id === sub.id;
                        const review = reviews[sub.id];
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelected(sub)}
                            className={`w-full text-left rounded-2xl border-2 p-3 transition ${isSelected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-900 bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{sub.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">v{sub.version} · {fmtDate(sub.createdAt)} · {fmtFileSize(sub.fileSize)}</p>
                              </div>
                              {STATUS_BADGE[sub.status]}
                            </div>
                            {review?.remarks && (
                              <p className="mt-2 text-xs text-slate-500 italic line-clamp-2">"{review.remarks}"</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — review panel */}
        <div className="space-y-4">
          {!selected ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">👈</div>
              <p className="font-bold text-slate-700">Select a submission to review</p>
              <p className="text-sm text-slate-400 mt-1">Click any submission on the left to open the review panel.</p>
            </div>
          ) : (
            <>
              {/* Document panel */}
              <div className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-slate-900">{selected.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selected.fileName} · {fmtFileSize(selected.fileSize)} · {STAGE_LABELS[selected.stage]} v{selected.version}</p>
                    <p className="text-xs text-slate-400">Submitted: {fmtDateTime(selected.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => download(selected)} className="btn-secondary text-xs px-3 py-1.5">↓ Download</button>
                    <button onClick={() => setPreview(p => !p)} className="btn-primary text-xs px-3 py-1.5">{preview ? 'Hide' : 'Preview'}</button>
                  </div>
                </div>

                {preview && (
                  <div>
                    {selected.fileType === 'application/pdf' ? (
                      <iframe src={proxyUrl(selected.fileUrl)} className="w-full rounded-2xl border-2 border-slate-200" style={{ height: '50vh' }} title="Document preview" />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-bold text-slate-600">DOCX preview unavailable</p>
                        <button onClick={() => download(selected)} className="btn-secondary text-xs mt-3 px-3 py-1.5">Download to view</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Review form */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Your Review</h3>

                {saveMsg && (
                  <div className="rounded-2xl bg-green-50 border-2 border-green-400 px-4 py-2.5 text-sm font-bold text-green-800">{saveMsg}</div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Decision</label>
                  <div className="flex gap-3 flex-wrap">
                    {(['APPROVED', 'REVISION_REQUIRED', 'PENDING'] as SubmissionStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setReviewStatus(s)}
                        className={`rounded-full border-2 border-slate-900 px-4 py-2 text-sm font-bold transition shadow-[2px_2px_0_rgba(15,23,42,1)] ${
                          reviewStatus === s
                            ? s === 'APPROVED' ? 'bg-green-300' : s === 'REVISION_REQUIRED' ? 'bg-red-200' : 'bg-yellow-200'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        {s === 'APPROVED' ? 'Approve' : s === 'REVISION_REQUIRED' ? 'Revision Required' : 'Keep Pending'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Remarks / Comments</label>
                  <textarea
                    className="input resize-none"
                    rows={5}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Write detailed feedback for the student…"
                  />
                </div>

                <button onClick={handleSaveReview} disabled={saving} className="btn-primary w-full disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Review'}
                </button>

                {reviews[selected.id] && (
                  <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-xs text-slate-500">
                    <span className="font-bold">Last saved:</span> {fmtDateTime(reviews[selected.id].reviewedAt)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
