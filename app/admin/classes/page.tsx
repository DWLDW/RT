import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function createClass(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const name = String(formData.get('name') ?? '');
  const level = String(formData.get('level') ?? '');
  const teacherId = String(formData.get('teacherId') ?? '');
  if (!name || !teacherId) return;

  await prisma.class.create({ data: { name, level, teacherId } });
  revalidatePath('/admin/classes');
}

async function deleteClass(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.class.delete({ where: { id } });
  revalidatePath('/admin/classes');
}

export default async function AdminClassesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const [classes, teachers, materials] = await Promise.all([
    prisma.class.findMany({ include: { teacher: true }, orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ where: { role: 'TEACHER' }, orderBy: { name: 'asc' } }),
    prisma.material.findMany({ where: { classId: { not: null } }, orderBy: { createdAt: 'desc' }, take: 30 })
  ]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">반 관리</h1>

      <section className="bg-white p-4 rounded-xl shadow space-y-2">
        <h2 className="font-semibold">반 생성</h2>
        <form action={createClass} className="grid md:grid-cols-4 gap-2">
          <input name="name" placeholder="반 이름" required />
          <input name="level" placeholder="레벨" />
          <select name="teacherId" required>
            <option value="">담당 선생님 선택</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
          <button className="bg-blue-600 text-white">생성</button>
        </form>
      </section>

      <section className="bg-white p-4 rounded-xl shadow space-y-2">
        <h2 className="font-semibold">반 공통 준비물 업로드</h2>
        <form action="/api/upload/material" method="post" encType="multipart/form-data" className="grid md:grid-cols-5 gap-2">
          <input name="title" placeholder="자료 제목" required />
          <select name="classId" required>
            <option value="">반 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="description" placeholder="설명" />
          <input name="file" type="file" required className="pt-2" />
          <button className="bg-emerald-600 text-white">업로드</button>
        </form>
      </section>

      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">반 목록</h2>
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{c.name} ({c.level || '-'})</p>
                <p className="text-sm text-slate-600">담당: {c.teacher.name} ({c.teacher.email})</p>
              </div>
              <form action={deleteClass}>
                <input type="hidden" name="id" value={c.id} />
                <button className="bg-rose-600 text-white">삭제</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2">최근 반 공통 준비물</h2>
        <div className="space-y-2 text-sm">
          {materials.map((m) => (
            <div key={m.id} className="border rounded p-2">
              <p className="font-medium">{m.title}</p>
              <p>원본파일: {m.originalFileName} / 타입: {m.mimeType || '-'}</p>
              <p className="text-slate-600 break-all">경로: {m.filePath}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
