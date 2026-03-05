import Link from 'next/link';
import { auth } from '@/lib/auth';

export default async function TeacherHome() {
  const session = await auth();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
      <p>로그인: {session?.user?.email}</p>
      <p>권한: {session?.user?.role}</p>

      <Link href="/teacher/today" className="inline-block bg-indigo-600 text-white px-5 py-3 rounded-xl min-h-12">
        오늘 수업 화면 열기
      </Link>
    </main>
  );
}
