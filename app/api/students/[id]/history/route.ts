import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

    if (user.role !== 'ADMIN') {
      const canAccess = await prisma.enrollment.count({
        where: {
          studentId: params.id,
          class: {
            teacherId: user.id
          }
        }
      });

      if (canAccess === 0) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      }
    }

    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        attendance: {
          where: user.role === 'ADMIN' ? undefined : { lesson: { teacherId: user.id } },
          orderBy: { createdAt: 'desc' }
        },
        evaluations: {
          where: user.role === 'ADMIN' ? undefined : { lesson: { teacherId: user.id } },
          orderBy: { createdAt: 'desc' }
        },
        aiFeedback: {
          where: user.role === 'ADMIN' ? undefined : { lesson: { teacherId: user.id } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json(student);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
