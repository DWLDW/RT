import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';

export async function GET() {
  try {
    const user = await requireAuth();
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const day = today.getDay();

    const schedules = await prisma.schedule.findMany({
      where:
        user.role === 'ADMIN'
          ? { dayOfWeek: day }
          : { dayOfWeek: day, class: { teacherId: user.id } },
      include: {
        class: {
          select: { id: true, name: true, level: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const lessons = await prisma.lesson.findMany({
      where:
        user.role === 'ADMIN'
          ? { lessonDate: { gte: start, lte: end } }
          : { teacherId: user.id, lessonDate: { gte: start, lte: end } },
      include: {
        class: { select: { id: true, name: true, level: true } }
      },
      orderBy: { lessonDate: 'asc' }
    });

    return NextResponse.json({ today: start.toISOString().slice(0, 10), schedules, lessons });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
