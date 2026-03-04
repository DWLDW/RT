import { NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const provider = getStorageProvider();
  const saved = await provider.save(file);

  return NextResponse.json(saved, { status: 201 });
}
