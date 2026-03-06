-- Add per-lesson cached shared summary for AI token optimization
ALTER TABLE "Lesson"
ADD COLUMN IF NOT EXISTS "sharedSummary" TEXT;
