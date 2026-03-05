import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const title = String(form.get('title') ?? 'Untitled Material');
    const description = String(form.get('description') ?? '');
    const classIdRaw = String(form.get('classId') ?? '').trim();
    const lessonIdRaw = String(form.get('lessonId') ?? '').trim();

    const classId = classIdRaw || null;
    const lessonId = lessonIdRaw || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!classId && !lessonId) {
      return NextResponse.json({ error: 'classId or lessonId is required' }, { status: 400 });
    }

    const uploadRoot = process.env.UPLOAD_DIR ?? '/data/uploads';
    await mkdir(uploadRoot, { recursive: true });

    const ext = path.extname(file.name);
    const safeFileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const absolutePath = path.join(uploadRoot, safeFileName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, bytes);

    const material = await prisma.material.create({
      data: {
        title,
        description,
        filePath: absolutePath,
        originalFileName: file.name,
        mimeType: file.type || null,
        classId,
        lessonId
      }
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
