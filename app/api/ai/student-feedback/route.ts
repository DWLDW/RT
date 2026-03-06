import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authorization';
import { generateLessonFeedbackBatch, generateStudentFeedback } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const body = (await request.json()) as {
      lessonId?: string;
      studentId?: string;
      mode?: 'single' | 'batch';
      forceRegenerate?: boolean;
    };

    if (!body.lessonId) return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });

    if (body.mode === 'batch') {
      const rows = await generateLessonFeedbackBatch(body.lessonId);
      return NextResponse.json({ rows, count: rows.length });
    }

    if (!body.studentId) return NextResponse.json({ error: 'studentId is required for single mode' }, { status: 400 });

    const result = await generateStudentFeedback({
      lessonId: body.lessonId,
      studentId: body.studentId,
      forceRegenerate: body.forceRegenerate
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'LESSON_NOT_FOUND' || message === 'STUDENT_NOT_FOUND'
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const body = (await request.json()) as { feedbackId?: string; content?: string };
    if (!body.feedbackId || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'feedbackId/content required' }, { status: 400 });
    }

    const updated = await prisma.aiFeedback.update({
      where: { id: body.feedbackId },
      data: { content: body.content }
    });

    return NextResponse.json({ updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
