import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get('name') ?? '');
  const grade = String(form.get('grade') ?? '');

  if (!name || !grade) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  await prisma.student.create({ data: { name, grade } });
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
