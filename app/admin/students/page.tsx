import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function createStudent(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const name = String(formData.get('name') ?? '');
  const grade = String(formData.get('grade') ?? '');
  const level = String(formData.get('level') ?? '');

  if (!name) return;
  await prisma.student.create({ data: { name, grade, level } });
  revalidatePath('/admin/students');
}

async function deleteStudent(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.student.delete({ where: { id } });
  revalidatePath('/admin/students');
}

async function enrollStudent(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const studentId = String(formData.get('studentId') ?? '');
  const classId = String(formData.get('classId') ?? '');
  if (!studentId || !classId) return;

  await prisma.enrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: {},
    create: { classId, studentId }
  });
  revalidatePath('/admin/students');
}

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const [students, classes, enrollments] = await Promise.all([
    prisma.student.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.class.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.enrollment.findMany({ include: { class: true, student: true } })
  ]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">학생 관리</h1>

      <section className="bg-white p-4 rounded-xl shadow space-y-2">
        <h2 className="font-semibold">학생 생성</h2>
        <form action={createStudent} className="grid md:grid-cols-4 gap-2">
          <input name="name" placeholder="이름" required />
          <input name="grade" placeholder="학년" />
          <input name="level" placeholder="레벨" />
          <button className="bg-blue-600 text-white">추가</button>
        </form>
      </section>

      <section className="bg-white p-4 rounded-xl shadow space-y-2">
        <h2 className="font-semibold">반 배정</h2>
        <form action={enrollStudent} className="grid md:grid-cols-3 gap-2">
          <select name="studentId" required>
            <option value="">학생 선택</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select name="classId" required>
            <option value="">반 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="bg-indigo-600 text-white">배정</button>
        </form>
      </section>

      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">학생 목록</h2>
        <div className="space-y-2">
          {students.map((s) => {
            const myEnroll = enrollments.filter((e) => e.studentId === s.id).map((e) => e.class.name).join(', ');
            return (
              <div key={s.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{s.name} ({s.grade || '-'})</p>
                  <p className="text-sm text-slate-600">배정 반: {myEnroll || '없음'}</p>
                </div>
                <form action={deleteStudent}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="bg-rose-600 text-white">삭제</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
