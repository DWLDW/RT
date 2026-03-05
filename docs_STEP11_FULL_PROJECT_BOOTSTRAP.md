# Step 11: Full Project Bootstrap (from empty server/repo)

This document summarizes the complete generation status of the ReadingTown Staff project and gives copy/paste commands for a clean bootstrap.

## 1) Initialize Next.js project (TypeScript + App Router)

```bash
npx create-next-app@latest readingtown-staff --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd readingtown-staff
```

## 2) Install required dependencies

```bash
npm install @prisma/client prisma next-auth bcryptjs openai exceljs zod xlsx date-fns
npm install -D tsx
```

## 3) Create folder structure

Implemented structure in this repository:

- Student management: `app/admin/students`, `app/(dashboard)/students/[id]`
- Class management: `app/admin/classes`
- Schedules: `app/admin/schedule`, `app/api/teacher/schedules`
- Lesson attendance: `app/teacher/lesson/[lessonId]`, `app/api/attendance`
- Evaluation checklist: `app/admin/evaluations`, `app/api/evaluations`
- AI feedback: `app/admin/feedback`, `app/api/ai/*`, `lib/ai.ts`
- Excel export: `app/admin/export`, `app/api/export`

## 4) Prisma + PostgreSQL

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

## 5) Run development server

```bash
npm run dev
```

## 6) Docker + docker-compose

```bash
docker compose up -d --build
```

## 7) Production deployment

- Nginx reverse proxy config: `infra/nginx/staff.readingtown.cn.conf`
- systemd service for auto-start: `infra/systemd/staff-app.service`
- operation runbook: `docs_STEP10_OPERATIONS.md`

## 8) Current status checklist

- [x] Next.js (TypeScript/App Router)
- [x] Tailwind CSS
- [x] Prisma + PostgreSQL
- [x] NextAuth auth
- [x] Docker + compose
- [x] Student/Class/Schedule/Attendance/Evaluation/AI/Export modules
