'use client';

import { useMemo, useState } from 'react';

type LessonOption = { id: string; label: string };
type StudentRow = { id: string; name: string; attendanceStatus: string; teacherComment: string; feedbackId?: string; feedbackContent?: string };

export function FeedbackManager({
  lessons,
  initialLessonId,
  initialSummary,
  initialRows
}: {
  lessons: LessonOption[];
  initialLessonId: string;
  initialSummary: string;
  initialRows: StudentRow[];
}) {
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [summary, setSummary] = useState(initialSummary);
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const lessonHref = useMemo(() => `/admin/feedback?lessonId=${lessonId}`, [lessonId]);

  const generateSummary = async () => {
    setMsg('공통요약 생성 중...');
    const res = await fetch('/api/ai/lesson-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, optionalNote: note })
    });
    const json = await res.json();
    if (!res.ok) return setMsg(`실패: ${json.error}`);
    setSummary(json.sharedSummary || '');
    setMsg(json.reused ? '기존 공통요약 재사용' : '공통요약 생성 완료');
  };

  const generateBatch = async () => {
    setMsg('학생별 피드백 일괄 생성 중...');
    const res = await fetch('/api/ai/student-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, mode: 'batch' })
    });
    const json = await res.json();
    if (!res.ok) return setMsg(`실패: ${json.error}`);
    setMsg(`완료: ${json.count}건 생성/재사용`);
    window.location.href = lessonHref;
  };

  const saveEdited = async (feedbackId: string, content: string) => {
    const res = await fetch('/api/ai/student-feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackId, content })
    });
    const json = await res.json();
    if (!res.ok) return alert(`수정 실패: ${json.error}`);
    alert('수정 저장 완료');
  };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl shadow p-4 grid md:grid-cols-4 gap-2">
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <a href={lessonHref} className="bg-slate-700 text-white text-center rounded px-3 py-2">lesson 불러오기</a>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="추가 수업노트(옵션)" />
        <button onClick={generateSummary} className="bg-indigo-600 text-white">공통요약 생성/재사용</button>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold">오늘 수업 공통 요약</h2>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-36" />
        <button onClick={generateBatch} className="bg-emerald-600 text-white">학생별 피드백 일괄 생성</button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </section>

      <section className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="bg-white rounded-xl shadow p-4 space-y-2">
            <p className="font-semibold">{row.name} <span className="text-sm text-slate-500">({row.attendanceStatus})</span></p>
            <p className="text-sm text-slate-600">Teacher 코멘트: {row.teacherComment || '-'}</p>
            <textarea
              value={row.feedbackContent || ''}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], feedbackContent: e.target.value };
                setRows(next);
              }}
              placeholder="피드백 텍스트"
              className="min-h-32"
            />
            {row.feedbackId && (
              <button
                onClick={() => saveEdited(row.feedbackId!, row.feedbackContent || '')}
                className="bg-blue-600 text-white"
              >
                수정 저장
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
