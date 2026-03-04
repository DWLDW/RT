import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authorization';
import { generateLessonSharedSummary } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const body = (await request.json()) as {
      lessonId?: string;
      optionalNote?: string;
      forceRegenerate?: boolean;
    };

    if (!body.lessonId) return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });

    const result = await generateLessonSharedSummary({
      lessonId: body.lessonId,
      optionalNote: body.optionalNote,
      forceRegenerate: body.forceRegenerate
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'LESSON_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
