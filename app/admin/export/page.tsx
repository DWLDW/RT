import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function AdminExportPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { role: 'TEACHER' }, orderBy: { name: 'asc' } })
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">엑셀 내보내기</h1>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold">필터 설정</h2>
        <form action="/api/export" method="get" className="grid md:grid-cols-5 gap-2">
          <div>
            <label htmlFor="from" className="block text-sm mb-1">From</label>
            <input id="from" name="from" type="date" defaultValue={today} required />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm mb-1">To</label>
            <input id="to" name="to" type="date" defaultValue={today} required />
          </div>
          <div>
            <label htmlFor="classId" className="block text-sm mb-1">반</label>
            <select id="classId" name="classId" defaultValue="">
              <option value="">전체 반</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="teacherId" className="block text-sm mb-1">선생님</label>
            <select id="teacherId" name="teacherId" defaultValue="">
              <option value="">전체 선생님</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="bg-emerald-600 text-white w-full">Excel 다운로드</button>
          </div>
        </form>
      </section>
    </main>
  );
}
