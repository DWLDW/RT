import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';

export async function GET() {
  try {
    const user = await requireAuth();

    const schedules = await prisma.schedule.findMany({
      where: user.role === 'ADMIN' ? {} : { class: { teacherId: user.id } },
      include: { class: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
