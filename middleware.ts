import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  // 로그인 필요
  if (!req.auth?.user) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/** => ADMIN only
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/teacher', req.nextUrl.origin));
  }

  // /teacher/** => TEACHER or ADMIN
  if (pathname.startsWith('/teacher') && !['TEACHER', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*']
};
