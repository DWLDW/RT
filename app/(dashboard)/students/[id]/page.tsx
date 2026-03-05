import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

type Search = { from?: string; to?: string; summary?: string };

function dateOrDefault(input: string | undefined, fallback: Date, end = false) {
  if (!input) return fallback;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

export default async function StudentPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: Search;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const from = dateOrDefault(searchParams.from, defaultFrom, false);
  const to = dateOrDefault(searchParams.to, defaultTo, true);

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      summaryCache: true,
      aiFeedback: {
        include: { lesson: { include: { class: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      evaluations: {
        include: {
          lesson: { include: { class: true } },
          results: { include: { item: true }, orderBy: { item: { sortOrder: 'asc' } } }
        },
        orderBy: { lesson: { lessonDate: 'desc' } },
        take: 10
      }
    }
  });

  if (!student) return notFound();

  const [totalLessonsInRange, attendanceInRange] = await Promise.all([
    prisma.lesson.count({
      where: {
        lessonDate: { gte: from, lte: to },
        class: { enrollments: { some: { studentId: student.id } } }
      }
    }),
    prisma.attendance.findMany({
      where: {
        studentId: student.id,
        lesson: { lessonDate: { gte: from, lte: to } }
      },
      include: { lesson: { include: { class: true } } },
      orderBy: { lesson: { lessonDate: 'desc' } }
    })
  ]);

  const presentCount = attendanceInRange.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = totalLessonsInRange > 0 ? Math.round((presentCount / totalLessonsInRange) * 100) : 0;

  const evalSummaryMap = new Map<string, { name: string; type: string; count: number; scoreSum: number; scoreCount: number; checkedCount: number }>();
  for (const ev of student.evaluations) {
    for (const r of ev.results) {
      const key = r.itemId;
      const current =
        evalSummaryMap.get(key) || {
          name: r.item.name,
          type: r.item.itemType,
          count: 0,
          scoreSum: 0,
          scoreCount: 0,
          checkedCount: 0
        };
      current.count += 1;
      if (typeof r.score === 'number') {
        current.scoreSum += r.score;
        current.scoreCount += 1;
      }
      if (r.checked) current.checkedCount += 1;
      evalSummaryMap.set(key, current);
    }
  }

  const evalSummaries = [...evalSummaryMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="p-6 space-y-6">
      <header className="bg-white rounded-xl shadow p-4">
        <h1 className="text-2xl font-bold">학생 추적: {student.name}</h1>
        <p className="text-sm text-slate-600">학년: {student.grade || '-'} / 레벨: {student.level || '-'}</p>
      </header>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold">출석률 (기간 선택)</h2>
        <form method="get" className="grid md:grid-cols-4 gap-2">
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} />
          <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} />
          <button className="bg-slate-700 text-white">조회</button>
          <div className="text-sm text-slate-600 flex items-center">총 수업 {totalLessonsInRange}회</div>
        </form>
        <div className="rounded-lg bg-indigo-50 p-4">
          <p className="text-sm text-slate-600">출석률</p>
          <p className="text-3xl font-bold text-indigo-700">{attendanceRate}%</p>
          <p className="text-sm text-slate-600">출석 {presentCount} / 전체 {totalLessonsInRange}</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold">평가항목 요약 (최근 10회)</h2>
        <div className="space-y-2 text-sm">
          {evalSummaries.map((item) => (
            <div key={item.name} className="border rounded p-2">
              <p className="font-medium">{item.name}</p>
              {item.type === 'SCORE' ? (
                <p>평균 점수: {item.scoreCount ? (item.scoreSum / item.scoreCount).toFixed(2) : '-'} (기록 {item.scoreCount}회)</p>
              ) : (
                <p>체크 비율: {item.count ? Math.round((item.checkedCount / item.count) * 100) : 0}% ({item.checkedCount}/{item.count})</p>
              )}
            </div>
          ))}
          {evalSummaries.length === 0 && <p className="text-slate-500">평가 데이터가 없습니다.</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold">AI 피드백 히스토리 (최근 10개)</h2>
        <div className="space-y-2">
          {student.aiFeedback.map((f) => (
            <div key={f.id} className="border rounded p-3">
              <p className="text-xs text-slate-500">{f.createdAt.toLocaleString('ko-KR')} · {f.lesson.class.name}</p>
              <p className="whitespace-pre-wrap text-sm">{f.content}</p>
            </div>
          ))}
          {student.aiFeedback.length === 0 && <p className="text-slate-500">AI 피드백 기록이 없습니다.</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">학생 요약 (캐시)</h2>
          {session.user.role === 'ADMIN' && (
            <form action={`/api/students/${student.id}/summary`} method="post" className="flex gap-2">
              <button className="bg-blue-600 text-white">요약 갱신</button>
              <button className="bg-slate-700 text-white" name="force" value="1">강제 갱신</button>
            </form>
          )}
        </div>
        {searchParams.summary === 'updated' && <p className="text-xs text-emerald-600">요약이 업데이트되었습니다.</p>}
        {searchParams.summary === 'reused' && <p className="text-xs text-slate-500">최근 변경 없음/쿨다운으로 캐시 재사용했습니다.</p>}
        <div className="rounded border p-3">
          <p className="whitespace-pre-wrap text-sm">{student.summaryCache?.summaryText || '아직 요약 캐시가 없습니다.'}</p>
          <p className="text-xs text-slate-500 mt-2">최종 갱신: {student.summaryCache?.updatedAt.toLocaleString('ko-KR') || '-'}</p>
        </div>
      </section>
    </main>
  );
}
