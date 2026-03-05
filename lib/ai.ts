import 'server-only';

import OpenAI from 'openai';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sha256 = (input: string) => crypto.createHash('sha256').update(input).digest('hex');

export async function generateLessonSharedSummary(params: {
  lessonId: string;
  optionalNote?: string;
  forceRegenerate?: boolean;
}) {
  const { lessonId, optionalNote, forceRegenerate = false } = params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      class: {
        include: {
          materials: {
            where: { lessonId: null },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      materials: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!lesson) {
    throw new Error('LESSON_NOT_FOUND');
  }

  if (lesson.sharedSummary && !forceRegenerate) {
    return { sharedSummary: lesson.sharedSummary, reused: true };
  }

  const classMaterials = lesson.class.materials.map((m) => `${m.title} (${m.originalFileName})`).join(', ') || 'None';
  const lessonMaterials = lesson.materials.map((m) => `${m.title} (${m.originalFileName})`).join(', ') || 'None';

  const prompt = [
    `Class: ${lesson.class.name} (${lesson.class.level ?? '-'})`,
    `Lesson title: ${lesson.title}`,
    `Topic: ${lesson.topic ?? '-'}`,
    `Class materials: ${classMaterials}`,
    `Lesson materials: ${lessonMaterials}`,
    `Lesson notes: ${lesson.notes ?? '-'}`,
    `Additional notes: ${optionalNote ?? '-'}`
  ].join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'You are an English academy assistant. Create a concise shared lesson summary in Korean, exactly 5-8 sentences.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const sharedSummary = completion.choices[0]?.message?.content?.trim() || '';

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { sharedSummary }
  });

  return { sharedSummary, reused: false };
}

export async function generateStudentFeedback(params: {
  lessonId: string;
  studentId: string;
  forceRegenerate?: boolean;
}) {
  const { lessonId, studentId, forceRegenerate = false } = params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      class: true,
      attendance: { where: { studentId } },
      evaluations: {
        where: { studentId },
        include: {
          results: { include: { item: true }, orderBy: { item: { sortOrder: 'asc' } } }
        }
      }
    }
  });

  if (!lesson) throw new Error('LESSON_NOT_FOUND');
  if (!lesson.sharedSummary) throw new Error('LESSON_SUMMARY_REQUIRED');

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error('STUDENT_NOT_FOUND');

  const attendance = lesson.attendance[0];
  const evaluation = lesson.evaluations[0];

  const compactInput = {
    summary: lesson.sharedSummary,
    attendance: attendance?.status ?? 'PRESENT',
    evaluationItems:
      evaluation?.results.map((r) => ({
        n: r.item.name,
        t: r.item.itemType,
        s: r.score,
        c: r.checked,
        m: r.comment ?? ''
      })) ?? [],
    teacherComment: evaluation?.generalComment ?? ''
  };

  const inputHash = sha256(JSON.stringify(compactInput));

  const existing = await prisma.aiFeedback.findUnique({
    where: {
      lessonId_studentId_inputHash: { lessonId, studentId, inputHash }
    }
  });

  if (existing && !forceRegenerate) {
    return { feedback: existing, reused: true };
  }

  const prompt = JSON.stringify(compactInput);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content:
          'Write natural parent-facing English feedback for an English academy student in 2-4 short paragraphs. Include strengths and next steps.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';

  const feedback = await prisma.aiFeedback.create({
    data: {
      lessonId,
      studentId,
      inputHash,
      promptSummary: lesson.sharedSummary,
      content
    }
  });

  return { feedback, reused: false };
}

export async function generateLessonFeedbackBatch(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { class: { include: { enrollments: true } } }
  });
  if (!lesson) throw new Error('LESSON_NOT_FOUND');

  const results = [];
  for (const enrollment of lesson.class.enrollments) {
    const generated = await generateStudentFeedback({ lessonId, studentId: enrollment.studentId });
    results.push(generated.feedback);
  }
  return results;
}


// Backward-compatible wrapper used by existing route handlers
export async function generateFeedbackWithCache(studentId: string, lessonId: string, lessonNotes: string) {
  await generateLessonSharedSummary({ lessonId, optionalNote: lessonNotes });
  const { feedback } = await generateStudentFeedback({ lessonId, studentId });
  return feedback;
}


export async function refreshStudentSummaryCache(params: { studentId: string; force?: boolean }) {
  const { studentId, force = false } = params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      attendance: { include: { lesson: { include: { class: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 },
      evaluations: {
        include: {
          lesson: { include: { class: true } },
          results: { include: { item: true }, orderBy: { item: { sortOrder: 'asc' } } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      },
      aiFeedback: { orderBy: { createdAt: 'desc' }, take: 10 },
      summaryCache: true
    }
  });

  if (!student) throw new Error('STUDENT_NOT_FOUND');

  const latestSource = [
    student.attendance[0]?.updatedAt,
    student.evaluations[0]?.updatedAt,
    student.aiFeedback[0]?.createdAt
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  const cache = student.summaryCache;
  const cooldownMs = 6 * 60 * 60 * 1000; // 6h
  const now = Date.now();

  const recentlyUpdated = cache && now - new Date(cache.updatedAt).getTime() < cooldownMs;
  const sourceNotChanged = cache && latestSource && new Date(cache.updatedAt) >= new Date(latestSource);

  if (!force && cache && (recentlyUpdated || sourceNotChanged)) {
    return { summary: cache.summaryText, reused: true };
  }

  const compact = {
    student: { name: student.name, grade: student.grade, level: student.level },
    attendance: student.attendance.map((a) => ({ d: a.lesson.lessonDate.toISOString().slice(0, 10), s: a.status, c: a.lesson.class.name })),
    evaluations: student.evaluations.map((e) => ({
      d: e.lesson.lessonDate.toISOString().slice(0, 10),
      c: e.lesson.class.name,
      comment: e.generalComment ?? '',
      items: e.results.map((r) => ({ n: r.item.name, t: r.item.itemType, s: r.score, k: r.checked, m: r.comment ?? '' }))
    })),
    aiFeedback: student.aiFeedback.map((f) => ({ d: f.createdAt.toISOString().slice(0, 10), c: f.content.slice(0, 300) }))
  };

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You are a student progress assistant for an English academy. Write a concise Korean summary (6-10 sentences) of trends, strengths, risks, and next teaching actions.'
      },
      { role: 'user', content: JSON.stringify(compact) }
    ]
  });

  const summaryText = completion.choices[0]?.message?.content?.trim() || '';

  const saved = await prisma.studentSummaryCache.upsert({
    where: { studentId },
    update: { summaryText },
    create: { studentId, summaryText }
  });

  return { summary: saved.summaryText, reused: false };
}
