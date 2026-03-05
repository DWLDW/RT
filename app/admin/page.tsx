import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const cards = [
    { href: '/admin/students', title: '학생 관리', desc: '학생 CRUD + 반 배정' },
    { href: '/admin/classes', title: '반 관리', desc: '반 CRUD + 반 공통 준비물 업로드' },
    { href: '/admin/schedule', title: '시간표 관리', desc: '날짜/시간/반/선생님 관리' },
    { href: '/admin/evaluations', title: '평가 템플릿 관리', desc: '템플릿 CRUD + 항목 관리' },
    { href: '/admin/export', title: '엑셀 내보내기', desc: '기간/반/선생님 필터로 다운로드' },
    { href: '/admin/feedback', title: 'AI 피드백 관리', desc: 'lesson 공통요약/학생 피드백 생성' },
  ];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="bg-white rounded-xl p-4 shadow hover:shadow-md">
            <p className="font-semibold">{card.title}</p>
            <p className="text-sm text-slate-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
