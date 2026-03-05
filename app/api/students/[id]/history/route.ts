import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      attendance: { orderBy: { createdAt: 'desc' } },
      evaluations: { orderBy: { createdAt: 'desc' } },
      aiFeedback: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!student) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(student);
}
