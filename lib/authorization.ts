import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type AppRole = 'ADMIN' | 'TEACHER';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user;
}

export async function ensureLessonReadableByUser(lessonId: string, userId: string, role: AppRole) {
  if (role === 'ADMIN') return true;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true }
  });

  if (!lesson) throw new Error('LESSON_NOT_FOUND');
  if (lesson.teacherId !== userId) throw new Error('FORBIDDEN');
  return true;
}

export async function ensureLessonWritableByUser(lessonId: string, userId: string, role: AppRole) {
  return ensureLessonReadableByUser(lessonId, userId, role);
}
