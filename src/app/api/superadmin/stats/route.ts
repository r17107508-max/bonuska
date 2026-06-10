import { CompanyStatus } from "@prisma/client";
import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error } = await requireApiSuperadmin();
  if (error) return error;
  const [companies, payments, operations] = await Promise.all([
    getDb().company.findMany(),
    getDb().subscriptionPayment.findMany(),
    getDb().loyaltyTransaction.count(),
  ]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return ok({
    totalCompanies: companies.length,
    activeTrial: companies.filter((c) => c.status === CompanyStatus.ACTIVE_TRIAL).length,
    activePaid: companies.filter((c) => c.status === CompanyStatus.ACTIVE_PAID).length,
    expired: companies.filter((c) => c.status === CompanyStatus.PAYMENT_REQUIRED).length,
    pending: companies.filter((c) => c.status === CompanyStatus.PENDING).length,
    operations,
    monthlyIncome: payments.filter((p) => p.paidAt >= monthStart).reduce((sum, p) => sum + p.amount, 0),
  });
}
