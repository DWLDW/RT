'use client';

import { useMemo, useState } from 'react';

type Item = { id: string; name: string; itemType: 'SCORE' | 'CHECK'; maxScore: number | null };
type StudentRow = {
  studentId: string;
  studentName: string;
  attendanceStatus: 'PRESENT' | 'LATE' | 'ABSENT';
  attendanceMemo: string;
  generalComment: string;
  itemResults: Array<{ itemId: string; score: number | null; checked: boolean | null; comment: string }>;
};

export function LessonMvpForm({
  lessonId,
  templateId,
  items,
  initialRows
}: {
  lessonId: string;
  templateId: string;
  items: Item[];
  initialRows: StudentRow[];
}) {
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [message, setMessage] = useState('');

  const payload = useMemo(
    () => ({
      templateId,
      rows: rows.map((r) => ({
        studentId: r.studentId,
        attendanceStatus: r.attendanceStatus,
        attendanceMemo: r.attendanceMemo,
        generalComment: r.generalComment,
        items: r.itemResults
      }))
    }),
    [rows, templateId]
  );

  const save = async () => {
    setSaving(true);
    setMessage('저장 중...');
    const res = await fetch(`/api/teacher/lesson/${lessonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) setMessage('저장 완료');
    else setMessage('저장 실패');
    setSaving(false);
  };

  const updateRow = (idx: number, patch: Partial<StudentRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    if (autoSave) setTimeout(() => void save(), 250);
  };

  const updateItem = (rowIdx: number, itemId: string, patch: { score?: number | null; checked?: boolean | null; comment?: string }) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        itemResults: next[rowIdx].itemResults.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it))
      };
      return next;
    });
    if (autoSave) setTimeout(() => void save(), 250);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
          자동 저장
        </label>
        <button onClick={save} disabled={saving} className="bg-blue-600 text-white min-h-12 px-5 rounded-xl text-base">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}

      {rows.map((row, rowIdx) => (
        <section key={row.studentId} className="bg-white rounded-2xl shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">{row.studentName}</h3>

          <div className="grid grid-cols-3 gap-2">
            {(['PRESENT', 'LATE', 'ABSENT'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateRow(rowIdx, { attendanceStatus: status })}
                className={`min-h-12 rounded-xl text-sm ${
                  row.attendanceStatus === status ? 'bg-indigo-600 text-white' : 'bg-slate-100'
                }`}
              >
                {status === 'PRESENT' ? '출석' : status === 'LATE' ? '지각' : '결석'}
              </button>
            ))}
          </div>

          <input
            value={row.attendanceMemo}
            onChange={(e) => updateRow(rowIdx, { attendanceMemo: e.target.value })}
            placeholder="출석 메모"
            className="min-h-12"
          />

          <div className="space-y-3">
            {items.map((item) => {
              const current = row.itemResults.find((x) => x.itemId === item.id);
              if (!current) return null;

              return (
                <div key={item.id} className="border rounded-xl p-3 space-y-2">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.itemType === 'SCORE' ? (
                    <input
                      type="number"
                      min={0}
                      max={item.maxScore ?? 5}
                      value={current.score ?? ''}
                      onChange={(e) =>
                        updateItem(rowIdx, item.id, {
                          score: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                      className="min-h-12"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateItem(rowIdx, item.id, { checked: !current.checked })}
                      className={`min-h-12 w-full rounded-xl ${current.checked ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
                    >
                      {current.checked ? '체크됨' : '미체크'}
                    </button>
                  )}
                  <input
                    value={current.comment ?? ''}
                    onChange={(e) => updateItem(rowIdx, item.id, { comment: e.target.value })}
                    placeholder="항목 코멘트"
                    className="min-h-12"
                  />
                </div>
              );
            })}
          </div>

          <textarea
            value={row.generalComment}
            onChange={(e) => updateRow(rowIdx, { generalComment: e.target.value })}
            placeholder="종합 코멘트"
            className="min-h-24"
          />
        </section>
      ))}
    </div>
  );
}
