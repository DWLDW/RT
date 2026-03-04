import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authorization';
import ExcelJS from 'exceljs';

function parseDateBoundary(input: string | null, endOfDay = false) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const url = new URL(request.url);
    const from = parseDateBoundary(url.searchParams.get('from'));
    const to = parseDateBoundary(url.searchParams.get('to'), true);
    const classId = url.searchParams.get('classId') || undefined;
    const teacherId = url.searchParams.get('teacherId') || undefined;

    if (!from || !to) {
      return NextResponse.json({ error: 'from/to are required (yyyy-mm-dd)' }, { status: 400 });
    }

    const lessonWhere = {
      lessonDate: { gte: from, lte: to },
      ...(classId ? { classId } : {}),
      ...(teacherId ? { teacherId } : {})
    };

    const [attendances, evaluations, aiFeedbacks] = await Promise.all([
      prisma.attendance.findMany({
        where: { lesson: lessonWhere },
        include: {
          lesson: { include: { class: true, teacher: true } },
          student: true
        },
        orderBy: [{ lesson: { lessonDate: 'asc' } }, { student: { name: 'asc' } }]
      }),
      prisma.evaluation.findMany({
        where: { lesson: lessonWhere },
        include: {
          lesson: { include: { class: true } },
          student: true,
          results: { include: { item: true }, orderBy: { item: { sortOrder: 'asc' } } }
        },
        orderBy: [{ lesson: { lessonDate: 'asc' } }, { student: { name: 'asc' } }]
      }),
      prisma.aiFeedback.findMany({
        where: { lesson: lessonWhere },
        include: {
          lesson: { include: { class: true } },
          student: true
        },
        orderBy: [{ lesson: { lessonDate: 'asc' } }, { student: { name: 'asc' } }]
      })
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ReadingTown Staff';
    workbook.created = new Date();

    const attendanceSheet = workbook.addWorksheet('Attendance');
    attendanceSheet.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '반', key: 'className', width: 24 },
      { header: '선생님', key: 'teacher', width: 18 },
      { header: '학생', key: 'student', width: 18 },
      { header: '상태', key: 'status', width: 12 }
    ];

    attendances.forEach((a) => {
      attendanceSheet.addRow({
        date: a.lesson.lessonDate.toISOString().slice(0, 10),
        className: a.lesson.class.name,
        teacher: a.lesson.teacher.name,
        student: a.student.name,
        status: a.status
      });
    });

    const evalSheet = workbook.addWorksheet('Evaluations');
    evalSheet.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '반', key: 'className', width: 24 },
      { header: '학생', key: 'student', width: 18 },
      { header: '항목 결과', key: 'itemResults', width: 60 },
      { header: '코멘트', key: 'comment', width: 40 }
    ];

    evaluations.forEach((e) => {
      const itemText = e.results
        .map((r) => `${r.item.name}: ${r.item.itemType === 'SCORE' ? (r.score ?? '-') : (r.checked ? '체크' : '미체크')}`)
        .join(' | ');

      evalSheet.addRow({
        date: e.lesson.lessonDate.toISOString().slice(0, 10),
        className: e.lesson.class.name,
        student: e.student.name,
        itemResults: itemText,
        comment: e.generalComment ?? ''
      });
    });

    const feedbackSheet = workbook.addWorksheet('AI Feedback');
    feedbackSheet.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '반', key: 'className', width: 24 },
      { header: '학생', key: 'student', width: 18 },
      { header: '피드백 텍스트', key: 'content', width: 80 }
    ];

    aiFeedbacks.forEach((f) => {
      feedbackSheet.addRow({
        date: f.lesson.lessonDate.toISOString().slice(0, 10),
        className: f.lesson.class.name,
        student: f.student.name,
        content: f.content
      });
    });

    [attendanceSheet, evalSheet, feedbackSheet].forEach((sheet) => {
      const header = sheet.getRow(1);
      header.font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="readingtown-export-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.xlsx"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
