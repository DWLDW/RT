import { NextResponse } from 'next/server';
import { generateFeedbackWithCache } from '@/lib/ai';

export async function POST(request: Request) {
  const form = await request.formData();
  const studentId = String(form.get('studentId') ?? '');
  const lessonId = String(form.get('lessonId') ?? '');
  const lessonNotes = String(form.get('lessonNotes') ?? '');

  try {
    await generateFeedbackWithCache(studentId, lessonId, lessonNotes);
    return NextResponse.redirect(new URL(`/students/${studentId}`, request.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown error' },
      { status: 400 }
    );
  }
}
