import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureLessonWritableByUser, requireAuth } from '@/lib/authorization';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const form = await request.formData();
    const studentId = String(form.get('studentId') ?? '');
    const lessonId = String(form.get('lessonId') ?? '');
    const templateId = String(form.get('templateId') ?? '');
    const generalComment = String(form.get('generalComment') ?? '');

    await ensureLessonWritableByUser(lessonId, user.id, user.role);

    await prisma.evaluation.upsert({
      where: { lessonId_studentId: { lessonId, studentId } },
      update: { templateId, generalComment },
      create: { lessonId, studentId, templateId, generalComment }
    });

    return NextResponse.redirect(new URL(`/students/${studentId}`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
