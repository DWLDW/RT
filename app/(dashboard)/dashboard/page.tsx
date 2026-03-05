import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const students = await prisma.student.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">운영 대시보드</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">학생 등록</h2>
          <form action="/api/students" method="post" className="space-y-2">
            <input name="name" placeholder="학생 이름" required />
            <input name="grade" placeholder="학년" required />
            <button className="bg-blue-600 text-white" type="submit">학생 추가</button>
          </form>
        </section>
        <section className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Excel 내보내기</h2>
          <a href="/api/export" className="inline-block bg-emerald-600 text-white rounded px-3 py-2">
            출석+평가 다운로드(.xlsx)
          </a>
        </section>
      </div>

      <section className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">최근 학생</h2>
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="border p-3 rounded flex justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-slate-500">{s.grade}</p>
              </div>
              <Link href={`/students/${s.id}`} className="text-blue-600">
                상세/히스토리
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
