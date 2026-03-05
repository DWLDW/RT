import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authorization';
import { refreshStudentSummaryCache } from '@/lib/ai';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const form = await request.formData();
    const force = String(form.get('force') ?? '') === '1';

    const result = await refreshStudentSummaryCache({ studentId: params.id, force });

    const back = new URL(`/students/${params.id}`, request.url);
    back.searchParams.set('summary', result.reused ? 'reused' : 'updated');
    return NextResponse.redirect(back);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'STUDENT_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
