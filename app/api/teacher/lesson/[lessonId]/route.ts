import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureLessonReadableByUser, ensureLessonWritableByUser, requireAuth } from '@/lib/authorization';
import { AttendanceStatus } from '@prisma/client';

interface SavePayload {
  templateId: string;
  rows: Array<{
    studentId: string;
    attendanceStatus: AttendanceStatus;
    attendanceMemo?: string;
    generalComment?: string;
    items: Array<{
      itemId: string;
      score?: number | null;
      checked?: boolean | null;
      comment?: string;
    }>;
  }>;
}

export async function GET(_request: Request, { params }: { params: { lessonId: string } }) {
  try {
    const user = await requireAuth();
    const lessonId = params.lessonId;
    await ensureLessonReadableByUser(lessonId, user.id, user.role);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
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
        evaluations: {
          include: {
            results: true
          }
        }
      }
    });

    if (!lesson) return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });

    const template = lesson.class.evaluationTemplates[0] ?? null;

    const students = lesson.class.enrollments.map((enrollment) => {
      const student = enrollment.student;
      const attendance = lesson.attendance.find((a) => a.studentId === student.id);
      const evaluation = lesson.evaluations.find((e) => e.studentId === student.id);

      return {
        studentId: student.id,
        studentName: student.name,
        attendanceStatus: attendance?.status ?? 'PRESENT',
        attendanceMemo: attendance?.memo ?? '',
        generalComment: evaluation?.generalComment ?? '',
        itemResults:
          template?.items.map((item) => {
            const result = evaluation?.results.find((r) => r.itemId === item.id);
            return {
              itemId: item.id,
              score: result?.score ?? null,
              checked: result?.checked ?? null,
              comment: result?.comment ?? ''
            };
          }) ?? []
      };
    });

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        lessonDate: lesson.lessonDate,
        class: {
          id: lesson.class.id,
          name: lesson.class.name,
          level: lesson.class.level
        }
      },
      template,
      students
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status =
      message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: { params: { lessonId: string } }) {
  try {
    const user = await requireAuth();
    const lessonId = params.lessonId;
    await ensureLessonWritableByUser(lessonId, user.id, user.role);

    const body = (await request.json()) as SavePayload;

    await prisma.$transaction(async (tx) => {
      for (const row of body.rows) {
        await tx.attendance.upsert({
          where: { lessonId_studentId: { lessonId, studentId: row.studentId } },
          update: {
            status: row.attendanceStatus,
            memo: row.attendanceMemo ?? ''
          },
          create: {
            lessonId,
            studentId: row.studentId,
            status: row.attendanceStatus,
            memo: row.attendanceMemo ?? ''
          }
        });

        const evaluation = await tx.evaluation.upsert({
          where: { lessonId_studentId: { lessonId, studentId: row.studentId } },
          update: {
            templateId: body.templateId,
            generalComment: row.generalComment ?? ''
          },
          create: {
            lessonId,
            studentId: row.studentId,
            templateId: body.templateId,
            generalComment: row.generalComment ?? ''
          }
        });

        for (const item of row.items) {
          await tx.evaluationResult.upsert({
            where: {
              evaluationId_itemId: {
                evaluationId: evaluation.id,
                itemId: item.itemId
              }
            },
            update: {
              score: item.score ?? null,
              checked: item.checked ?? null,
              comment: item.comment ?? ''
            },
            create: {
              evaluationId: evaluation.id,
              itemId: item.itemId,
              score: item.score ?? null,
              checked: item.checked ?? null,
              comment: item.comment ?? ''
            }
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status =
      message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
