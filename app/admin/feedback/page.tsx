import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { FeedbackManager } from '@/components/admin/FeedbackManager';

export default async function AdminFeedbackPage({
  searchParams
}: {
  searchParams: { lessonId?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const lessons = await prisma.lesson.findMany({
    include: { class: true },
    orderBy: { lessonDate: 'desc' },
    take: 100
  });

  const lessonId = searchParams.lessonId || lessons[0]?.id;

  const target = lessonId
    ? await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          class: { include: { enrollments: { include: { student: true } } } },
          attendance: true,
          evaluations: true,
          aiFeedback: { orderBy: { createdAt: 'desc' } }
        }
      })
    : null;

  const rows =
    target?.class.enrollments.map((enrollment) => {
      const student = enrollment.student;
      const attendance = target.attendance.find((a) => a.studentId === student.id);
      const evaluation = target.evaluations.find((e) => e.studentId === student.id);
      const feedback = target.aiFeedback.find((f) => f.studentId === student.id);

      return {
        id: student.id,
        name: student.name,
        attendanceStatus: attendance?.status ?? 'PRESENT',
        teacherComment: evaluation?.generalComment ?? '',
        feedbackId: feedback?.id,
        feedbackContent: feedback?.content ?? ''
      };
    }) ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI 피드백 생성 관리</h1>

      <FeedbackManager
        lessons={lessons.map((l) => ({
          id: l.id,
          label: `${l.lessonDate.toISOString().slice(0, 10)} | ${l.class.name} | ${l.title}`
        }))}
        initialLessonId={lessonId ?? ''}
        initialSummary={target?.sharedSummary ?? ''}
        initialRows={rows}
      />
    </main>
  );
}
