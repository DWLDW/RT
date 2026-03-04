import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function createSchedule(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const date = String(formData.get('date') ?? '');
  const startTime = String(formData.get('startTime') ?? '');
  const endTime = String(formData.get('endTime') ?? '');
  const classId = String(formData.get('classId') ?? '');
  const teacherId = String(formData.get('teacherId') ?? '');
  const room = String(formData.get('room') ?? '');
  if (!date || !startTime || !endTime || !classId || !teacherId) return;

  const jsDay = new Date(date).getDay();

  await prisma.$transaction(async (tx) => {
    await tx.class.update({ where: { id: classId }, data: { teacherId } });
    await tx.schedule.create({
      data: {
        classId,
        dayOfWeek: jsDay,
        startTime,
        endTime,
        room
      }
    });
  });

  revalidatePath('/admin/schedule');
}

async function deleteSchedule(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.schedule.delete({ where: { id } });
  revalidatePath('/admin/schedule');
}

export default async function AdminSchedulePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const [schedules, classes, teachers] = await Promise.all([
    prisma.schedule.findMany({ include: { class: { include: { teacher: true } } }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { role: 'TEACHER' }, orderBy: { name: 'asc' } })
  ]);

  const dayText = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">시간표 관리</h1>

      <section className="bg-white p-4 rounded-xl shadow">
        <form action={createSchedule} className="grid md:grid-cols-6 gap-2">
          <input type="date" name="date" required />
          <input type="time" name="startTime" required />
          <input type="time" name="endTime" required />
          <select name="classId" required>
            <option value="">반 선택</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="teacherId" required>
            <option value="">선생님 선택</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input name="room" placeholder="강의실" />
          <button className="bg-blue-600 text-white md:col-span-6">시간표 추가</button>
        </form>
      </section>

      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">시간표 목록</h2>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{s.class.name} / {dayText[s.dayOfWeek]}요일 {s.startTime}-{s.endTime}</p>
                <p className="text-sm text-slate-600">담당: {s.class.teacher.name} / 강의실: {s.room || '-'}</p>
              </div>
              <form action={deleteSchedule}>
                <input type="hidden" name="id" value={s.id} />
                <button className="bg-rose-600 text-white">삭제</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
