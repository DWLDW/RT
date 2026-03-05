import { ReactNode } from 'react';
import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between">
        <p className="font-semibold">ReadingTown Staff</p>
        <form action={logoutAction}>
          <button className="bg-slate-700">로그아웃</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
