import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function TeacherTodayPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const today = new Date();
  const day = today.getDay();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const schedules = await prisma.schedule.findMany({
    where:
      session.user.role === 'ADMIN'
        ? { dayOfWeek: day }
        : { dayOfWeek: day, class: { teacherId: session.user.id } },
    include: { class: true },
    orderBy: { startTime: 'asc' }
  });

  const lessons = await prisma.lesson.findMany({
    where:
      session.user.role === 'ADMIN'
        ? { lessonDate: { gte: start, lte: end } }
        : { teacherId: session.user.id, lessonDate: { gte: start, lte: end } },
    include: { class: true },
    orderBy: { lessonDate: 'asc' }
  });

  return (
    <main className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">오늘 수업</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">오늘 스케줄</h2>
        <div className="grid gap-3">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow p-4">
              <p className="font-semibold">{s.class.name}</p>
              <p className="text-sm text-slate-600">{s.startTime} ~ {s.endTime} {s.room ? `| ${s.room}` : ''}</p>
            </div>
          ))}
          {schedules.length === 0 && <p className="text-slate-500">오늘 등록된 스케줄이 없습니다.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">오늘 lesson 카드</h2>
        <div className="grid gap-3">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/teacher/lesson/${lesson.id}`}
              className="bg-indigo-600 text-white rounded-2xl p-4 min-h-20 flex flex-col justify-center active:scale-[0.99] transition"
            >
              <p className="font-semibold text-lg">{lesson.title}</p>
              <p className="text-sm text-indigo-100">{lesson.class.name} · {new Date(lesson.lessonDate).toLocaleTimeString('ko-KR')}</p>
            </Link>
          ))}
          {lessons.length === 0 && <p className="text-slate-500">오늘 lesson이 없습니다.</p>}
        </div>
      </section>
    </main>
  );
}
