import { NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';
import { requireAuth } from '@/lib/authorization';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const provider = getStorageProvider();
    const saved = await provider.save(file);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
