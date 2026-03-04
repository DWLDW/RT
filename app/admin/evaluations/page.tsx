import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { EvalItemType } from '@prisma/client';

async function createTemplate(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const name = String(formData.get('name') ?? '');
  const classIdRaw = String(formData.get('classId') ?? '');
  const level = String(formData.get('level') ?? '');
  if (!name) return;

  await prisma.evaluationTemplate.create({
    data: {
      name,
      classId: classIdRaw || null,
      level
    }
  });
  revalidatePath('/admin/evaluations');
}

async function deleteTemplate(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.evaluationTemplate.delete({ where: { id } });
  revalidatePath('/admin/evaluations');
}

async function addItem(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');

  const templateId = String(formData.get('templateId') ?? '');
  const name = String(formData.get('name') ?? '');
  const itemType = String(formData.get('itemType') ?? 'SCORE') as EvalItemType;
  const maxScoreRaw = String(formData.get('maxScore') ?? '');
  const sortOrder = Number(formData.get('sortOrder') ?? '0');
  if (!templateId || !name) return;

  await prisma.evaluationItem.create({
    data: {
      templateId,
      name,
      itemType,
      maxScore: maxScoreRaw ? Number(maxScoreRaw) : null,
      sortOrder
    }
  });
  revalidatePath('/admin/evaluations');
}

async function deleteItem(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/teacher');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.evaluationItem.delete({ where: { id } });
  revalidatePath('/admin/evaluations');
}

export default async function AdminEvaluationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/teacher');

  const [templates, classes] = await Promise.all([
    prisma.evaluationTemplate.findMany({ include: { items: { orderBy: { sortOrder: 'asc' } }, class: true }, orderBy: { createdAt: 'desc' } }),
    prisma.class.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">평가 템플릿 관리</h1>

      <section className="bg-white p-4 rounded-xl shadow">
        <form action={createTemplate} className="grid md:grid-cols-4 gap-2">
          <input name="name" placeholder="템플릿명" required />
          <select name="classId">
            <option value="">반 연결 없음</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="level" placeholder="레벨 (예:G5)" />
          <button className="bg-blue-600 text-white">템플릿 추가</button>
        </form>
      </section>

      <section className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-white p-4 rounded-xl shadow space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-slate-600">반: {t.class?.name || '-'} / 레벨: {t.level || '-'}</p>
              </div>
              <form action={deleteTemplate}>
                <input type="hidden" name="id" value={t.id} />
                <button className="bg-rose-600 text-white">템플릿 삭제</button>
              </form>
            </div>

            <form action={addItem} className="grid md:grid-cols-5 gap-2">
              <input type="hidden" name="templateId" value={t.id} />
              <input name="name" placeholder="항목명" required />
              <select name="itemType" defaultValue="SCORE">
                <option value="SCORE">점수</option>
                <option value="CHECK">체크</option>
              </select>
              <input name="maxScore" type="number" placeholder="최대점수(점수형만)" />
              <input name="sortOrder" type="number" placeholder="정렬" defaultValue={0} />
              <button className="bg-indigo-600 text-white md:col-span-5">항목 추가</button>
            </form>

            <div className="space-y-2">
              {t.items.map((item) => (
                <div key={item.id} className="border rounded p-2 flex justify-between items-center text-sm">
                  <p>{item.sortOrder}. {item.name} [{item.itemType}] {item.maxScore ? `(max:${item.maxScore})` : ''}</p>
                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="bg-slate-700 text-white">삭제</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
