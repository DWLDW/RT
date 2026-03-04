import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LessonMvpForm } from '@/components/teacher/LessonMvpForm';

export default async function TeacherLessonPage({ params }: { params: { lessonId: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      class: {
        include: {
          enrollments: {
            include: { student: true },
            orderBy: { enrolledAt: 'asc' }
          },
          evaluationTemplates: {
            where: { isActive: true },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      attendance: true,
      evaluations: { include: { results: true } }
    }
  });

  if (!lesson) return notFound();
  if (session.user.role === 'TEACHER' && lesson.teacherId !== session.user.id) {
    redirect('/teacher/today');
  }

  const template = lesson.class.evaluationTemplates[0];
  if (!template) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-bold">평가 템플릿이 없습니다.</h1>
        <p className="text-slate-600">이 반에 활성화된 evaluation template을 먼저 등록하세요.</p>
      </main>
    );
  }

  const rows = lesson.class.enrollments.map((enrollment) => {
    const student = enrollment.student;
    const attendance = lesson.attendance.find((a) => a.studentId === student.id);
    const evaluation = lesson.evaluations.find((e) => e.studentId === student.id);

    return {
      studentId: student.id,
      studentName: student.name,
      attendanceStatus: (attendance?.status ?? 'PRESENT') as 'PRESENT' | 'LATE' | 'ABSENT',
      attendanceMemo: attendance?.memo ?? '',
      generalComment: evaluation?.generalComment ?? '',
      itemResults: template.items.map((item) => {
        const result = evaluation?.results.find((r) => r.itemId === item.id);
        return {
          itemId: item.id,
          score: result?.score ?? null,
          checked: result?.checked ?? null,
          comment: result?.comment ?? ''
        };
      })
    };
  });

  return (
    <main className="p-4 md:p-6 space-y-4">
      <header className="bg-white rounded-2xl p-4 shadow">
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <p className="text-sm text-slate-600">{lesson.class.name} · {new Date(lesson.lessonDate).toLocaleString('ko-KR')}</p>
      </header>

      <LessonMvpForm
        lessonId={lesson.id}
        templateId={template.id}
        items={template.items.map((item) => ({
          id: item.id,
          name: item.name,
          itemType: item.itemType,
          maxScore: item.maxScore
        }))}
        initialRows={rows}
      />
    </main>
  );
}
