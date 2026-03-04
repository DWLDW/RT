import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureLessonWritableByUser, requireAuth } from '@/lib/authorization';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const form = await request.formData();
    const studentId = String(form.get('studentId') ?? '');
    const lessonId = String(form.get('lessonId') ?? '');
    const status = String(form.get('status') ?? 'PRESENT');
    const memo = String(form.get('memo') ?? '');

    await ensureLessonWritableByUser(lessonId, user.id, user.role);

    await prisma.attendance.upsert({
      where: { lessonId_studentId: { lessonId, studentId } },
      update: {
        status: status as 'PRESENT' | 'LATE' | 'ABSENT',
        memo
      },
      create: {
        lessonId,
        studentId,
        status: status as 'PRESENT' | 'LATE' | 'ABSENT',
        memo
      }
    });

    return NextResponse.redirect(new URL(`/students/${studentId}`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
