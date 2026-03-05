import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';

export async function GET() {
  try {
    const user = await requireAuth();

    const lessons = await prisma.lesson.findMany({
      where: user.role === 'ADMIN' ? {} : { teacherId: user.id },
      include: { class: true },
      orderBy: { lessonDate: 'desc' }
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
