import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

async function loginAction(formData: FormData): Promise<void> {
  'use server';

  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/teacher'
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?error=1');
    }
    throw error;
  }
}

export default function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const showError = searchParams?.error === '1';

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form action={loginAction} className="bg-white p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">ReadingTown Staff Login</h1>

        {showError ? (
          <p className="text-sm text-red-600">
            로그인 실패: 이메일 또는 비밀번호를 확인하세요.
          </p>
        ) : null}

        <div>
          <label htmlFor="email" className="block text-sm mb-1">이메일</label>
          <input id="email" name="email" type="email" placeholder="admin@readingtown.cn" required />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm mb-1">비밀번호</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <button className="bg-blue-600 text-white w-full" type="submit">로그인</button>
      </form>
    </main>
  );
}
