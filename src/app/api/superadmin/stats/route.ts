import { CompanyStatus, CompanyUserRole } from "@prisma/client";
import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { daysLeft } from "@/lib/format";

export async function GET() {
  const { error } = await requireApiSuperadmin();
  if (error) return error;
  const [companies, payments, operations, suspiciousAttempts, paymentRequests, emailLogs] = await Promise.all([
    getDb().company.findMany({
      where: { status: { not: CompanyStatus.DELETED } },
      include: {
        memberships: true,
        transactions: true,
        users: true,
        payments: true,
      },
    }),
    getDb().subscriptionPayment.findMany(),
    getDb().loyaltyTransaction.count(),
    getDb().auditLog.count({ where: { action: "SUSPICIOUS_REPEAT_PURCHASE" } }),
    getDb().auditLog.count({ where: { action: "PAYMENT_REVIEW_REQUESTED" } }),
    getDb().auditLog.findMany({ where: { entityType: "EmailNotification" }, select: { action: true } }),
  ]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paidCompanies = companies.filter((company) => company.payments.length > 0 || company.status === CompanyStatus.ACTIVE_PAID);
  const trialStarted = companies.filter((company) => company.trialStartedAt);
  const trialToPayment = trialStarted.length > 0 ? Math.round((paidCompanies.length / trialStarted.length) * 100) : 0;

  return ok({
    totalCompanies: companies.length,
    activeTrial: companies.filter((c) => c.status === CompanyStatus.ACTIVE_TRIAL).length,
    activePaid: companies.filter((c) => c.status === CompanyStatus.ACTIVE_PAID).length,
    expired: companies.filter((c) => c.status === CompanyStatus.PAYMENT_REQUIRED).length,
    pending: companies.filter((c) => c.status === CompanyStatus.PENDING).length,
    operations,
    suspiciousAttempts,
    paymentRequests,
    monthlyIncome: payments.filter((p) => p.paidAt >= monthStart).reduce((sum, p) => sum + p.amount, 0),
    newApplicationsMonth: companies.filter((company) => company.createdAt >= monthStart).length,
    trialStarted: trialStarted.length,
    paidCompanies: paidCompanies.length,
    trialToPayment,
    trialEndingSoon: companies.filter((company) => company.status === CompanyStatus.ACTIVE_TRIAL && daysLeft(company.trialEndsAt) <= 3).length,
    companiesWithoutOperations: companies.filter((company) => company.transactions.length === 0).length,
    companiesWithCashier: companies.filter((company) => company.users.some((user) => user.role === CompanyUserRole.CASHIER && user.isActive)).length,
    companiesWith10Clients: companies.filter((company) => company.memberships.length >= 10).length,
    emailSent: emailLogs.filter((log) => log.action.endsWith("_SENT")).length,
    emailFailed: emailLogs.filter((log) => log.action.endsWith("_FAILED")).length,
    emailSkipped: emailLogs.filter((log) => log.action.endsWith("_SKIPPED")).length,
  });
}
