import { CompanyStatus } from "@prisma/client";
import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const settings = await getSettings();
  const company = await getDb().company.findUniqueOrThrow({ where: { id } });
  const periodStart = company.paidUntil && company.paidUntil > new Date() ? company.paidUntil : new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);
  const payment = await getDb().subscriptionPayment.create({
    data: {
      companyId: id,
      amount: Number(body.amount ?? settings.subscriptionPrice),
      paidAt: new Date(),
      periodStart,
      periodEnd,
      method: "manual",
      comment: body.comment ? String(body.comment) : null,
      confirmedById: user!.id,
    },
  });
  await getDb().company.update({
    where: { id },
    data: { status: CompanyStatus.ACTIVE_PAID, paidUntil: periodEnd, lastPaidAt: new Date(), isBlocked: false },
  });
  return ok({ payment });
}
