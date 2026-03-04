import bcrypt from 'bcryptjs';
import { PrismaClient, Role, EvalItemType, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD ?? 'Teacher123!';

  const [adminHash, teacherHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(teacherPassword, 10)
  ]);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'RT Admin',
      email: 'admin@readingtown.cn',
      role: Role.ADMIN,
      passwordHash: adminHash
    },
    create: {
      username: 'admin',
      name: 'RT Admin',
      email: 'admin@readingtown.cn',
      passwordHash: adminHash,
      role: Role.ADMIN
    }
  });

  const teacher = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {
      name: 'RT Teacher 1',
      email: 'teacher1@readingtown.cn',
      role: Role.TEACHER,
      passwordHash: teacherHash
    },
    create: {
      username: 'teacher1',
      name: 'RT Teacher 1',
      email: 'teacher1@readingtown.cn',
      passwordHash: teacherHash,
      role: Role.TEACHER
    }
  });

  const sampleClass = await prisma.class.create({
    data: {
      name: 'G5 Reading Master',
      level: 'G5',
      description: 'Sample class for initial setup',
      teacherId: teacher.id
    }
  });

  await prisma.schedule.createMany({
    data: [
      { classId: sampleClass.id, dayOfWeek: 2, startTime: '16:00', endTime: '17:30', room: 'Room A' },
      { classId: sampleClass.id, dayOfWeek: 4, startTime: '16:00', endTime: '17:30', room: 'Room A' }
    ]
  });

  const student = await prisma.student.create({
    data: {
      studentCode: `STU-${Date.now()}`,
      name: 'Sample Student',
      grade: 'Grade 5',
      level: 'G5',
      parentContact: '010-0000-0000'
    }
  });

  await prisma.enrollment.create({
    data: {
      classId: sampleClass.id,
      studentId: student.id
    }
  });

  const template = await prisma.evaluationTemplate.create({
    data: {
      name: 'G5 Weekly Reading Evaluation',
      classId: sampleClass.id,
      level: 'G5',
      description: 'Sample template connected to class+level',
      items: {
        create: [
          {
            name: 'Vocabulary Accuracy',
            description: 'Words understood correctly',
            itemType: EvalItemType.SCORE,
            maxScore: 5,
            sortOrder: 1
          },
          {
            name: 'Reading Fluency',
            description: 'Speed and natural intonation',
            itemType: EvalItemType.SCORE,
            maxScore: 5,
            sortOrder: 2
          },
          {
            name: 'Homework Completed',
            description: 'Homework submission check',
            itemType: EvalItemType.CHECK,
            sortOrder: 3
          }
        ]
      }
    },
    include: { items: true }
  });

  const lesson = await prisma.lesson.create({
    data: {
      classId: sampleClass.id,
      teacherId: teacher.id,
      lessonDate: new Date(),
      title: 'Sample Lesson 1',
      topic: 'Main Idea & Supporting Details',
      notes: 'Shared notes for lesson summary cache test.'
    }
  });

  await prisma.attendance.create({
    data: {
      lessonId: lesson.id,
      studentId: student.id,
      status: AttendanceStatus.PRESENT
    }
  });

  const evaluation = await prisma.evaluation.create({
    data: {
      lessonId: lesson.id,
      studentId: student.id,
      templateId: template.id,
      generalComment: 'Great participation and stable reading pace.'
    }
  });

  const vocab = template.items.find((x) => x.name === 'Vocabulary Accuracy');
  const fluency = template.items.find((x) => x.name === 'Reading Fluency');
  const homework = template.items.find((x) => x.name === 'Homework Completed');

  await prisma.evaluationResult.createMany({
    data: [
      {
        evaluationId: evaluation.id,
        itemId: vocab!.id,
        score: 4,
        comment: 'Needs review on abstract words.'
      },
      {
        evaluationId: evaluation.id,
        itemId: fluency!.id,
        score: 5,
        comment: 'Excellent rhythm.'
      },
      {
        evaluationId: evaluation.id,
        itemId: homework!.id,
        checked: true,
        comment: 'Completed on time.'
      }
    ]
  });

  await prisma.material.create({
    data: {
      title: 'Class Common Worksheet',
      description: 'Common material for all lessons in this class',
      filePath: '/app/uploads/materials/class-common-worksheet.pdf',
      originalFileName: 'class-common-worksheet.pdf',
      mimeType: 'application/pdf',
      classId: sampleClass.id
    }
  });

  await prisma.material.create({
    data: {
      title: 'Lesson 1 Extra Handout',
      description: 'Lesson-specific material',
      filePath: '/app/uploads/materials/lesson1-extra-handout.pdf',
      originalFileName: 'lesson1-extra-handout.pdf',
      mimeType: 'application/pdf',
      lessonId: lesson.id
    }
  });

  await prisma.studentSummaryCache.upsert({
    where: { studentId: student.id },
    update: {
      summaryText: 'Sample student shows strong fluency and consistent homework completion.'
    },
    create: {
      studentId: student.id,
      summaryText: 'Sample student shows strong fluency and consistent homework completion.'
    }
  });

  console.log('Seed completed');
  console.log(`admin email: admin@readingtown.cn / password: ${adminPassword}`);
  console.log(`teacher email: teacher1@readingtown.cn / password: ${teacherPassword}`);
  console.log(`sample class teacherId: ${teacher.id}`);
  console.log(`superuser id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
