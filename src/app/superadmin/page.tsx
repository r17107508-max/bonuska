import Link from "next/link";
import { CompanyStatus, CompanyUserRole } from "@prisma/client";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { SuperadminNotifications } from "@/components/superadmin-notifications";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, money } from "@/lib/format";

export default async function SuperadminPage() {
  await requireSuperadmin();
  const db = getDb();
  const [companies, payments, operations, suspiciousAttempts, paymentRequests, emailLogs] = await Promise.all([
    db.company.findMany({
      include: {
        memberships: true,
        transactions: true,
        users: true,
        payments: true,
      },
    }),
    db.subscriptionPayment.findMany(),
    db.loyaltyTransaction.count(),
    db.auditLog.count({ where: { action: "SUSPICIOUS_REPEAT_PURCHASE" } }),
    db.auditLog.count({ where: { action: "PAYMENT_REVIEW_REQUESTED" } }),
    db.auditLog.findMany({
      where: { entityType: "EmailNotification" },
      select: { action: true },
    }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyIncome = payments.filter((payment) => payment.paidAt >= monthStart).reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCompanies = companies.filter((company) => company.status === CompanyStatus.PENDING);
  const paidCompanies = companies.filter((company) => company.payments.length > 0 || company.status === CompanyStatus.ACTIVE_PAID);
  const trialStarted = companies.filter((company) => company.trialStartedAt);
  const trialToPayment = trialStarted.length > 0 ? Math.round((paidCompanies.length / trialStarted.length) * 100) : 0;
  const companiesWithoutOperations = companies.filter((company) => company.transactions.length === 0);
  const companiesWithCashier = companies.filter((company) =>
    company.users.some((user) => user.role === CompanyUserRole.CASHIER && user.isActive),
  );
  const companiesWith10Clients = companies.filter((company) => company.memberships.length >= 10);
  const trialEndingSoon = companies.filter(
    (company) => company.status === CompanyStatus.ACTIVE_TRIAL && daysLeft(company.trialEndsAt) <= 3,
  );
  const emailSent = emailLogs.filter((log) => log.action.endsWith("_SENT")).length;
  const emailFailed = emailLogs.filter((log) => log.action.endsWith("_FAILED")).length;
  const emailSkipped = emailLogs.filter((log) => log.action.endsWith("_SKIPPED")).length;
  const cards = [
    ["Компании всего", companies.length],
    ["Активные trial", companies.filter((company) => company.status === CompanyStatus.ACTIVE_TRIAL).length],
    ["Активные платные", companies.filter((company) => company.status === CompanyStatus.ACTIVE_PAID).length],
    ["Просроченные", companies.filter((company) => company.status === CompanyStatus.PAYMENT_REQUIRED).length],
    ["Заявки", pendingCompanies.length],
    ["Доход за месяц", money(monthlyIncome)],
    ["Операций всего", operations],
    ["Подозрительных попыток", suspiciousAttempts],
    ["Ожидаемые оплаты", companies.filter((company) => company.status === CompanyStatus.PAYMENT_REQUIRED).length],
  ];
  const funnelCards = [
    ["Заявок за месяц", companies.filter((company) => company.createdAt >= monthStart).length],
    ["Trial запускали", trialStarted.length],
    ["Оплачивали", paidCompanies.length],
    ["Trial → оплата", `${trialToPayment}%`],
    ["Запросов оплаты", paymentRequests],
    ["Trial ≤ 3 дня", trialEndingSoon.length],
  ];
  const healthCards = [
    ["Без операций", companiesWithoutOperations.length],
    ["С кассиром", companiesWithCashier.length],
    ["10+ клиентов", companiesWith10Clients.length],
    ["Email sent", emailSent],
    ["Email failed", emailFailed],
    ["Email skipped", emailSkipped],
  ];

  return (
    <AdminShell title="Глобальная панель" subtitle="Состояние SaaS-платформы и быстрый контроль компаний." nav={superadminNav}>
      <SuperadminNotifications pendingCount={pendingCompanies.length} />

      {pendingCompanies.length > 0 && (
        <Link href="/superadmin/companies" className="mb-5 block rounded-lg bg-amber-50 p-4 font-semibold text-amber-900">
          Новые заявки на подтверждение: {pendingCompanies.length}. Откройте список компаний, чтобы проверить и подтвердить регистрацию.
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="panel mt-6 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Воронка trial → оплата</h2>
            <p className="mt-2 text-sm text-slate-600">Показывает, сколько компаний дошли от заявки и trial до реальной оплаты.</p>
          </div>
          <Link href="/superadmin/payments" className="text-sm font-semibold text-teal-700">Оплаты</Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {funnelCards.map(([label, value]) => (
            <SmallMetric key={label} label={String(label)} value={String(value)} />
          ))}
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Операционное здоровье</h2>
            <p className="mt-2 text-sm text-slate-600">Быстрые сигналы: кому нужна помощь с запуском, где не сработали письма, где нет кассиров.</p>
          </div>
          <Link href="/superadmin/companies" className="text-sm font-semibold text-teal-700">Все компании</Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {healthCards.map(([label, value]) => (
            <SmallMetric key={label} label={String(label)} value={String(value)} />
          ))}
        </div>
      </section>

      {companiesWithoutOperations.length > 0 && (
        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Компании без операций</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {companiesWithoutOperations.slice(0, 8).map((company) => (
              <Link key={company.id} href={`/superadmin/companies/${company.id}`} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="font-semibold text-slate-950">{company.name}</span>
                  <span className="ml-2 text-sm text-slate-500">{company.city}</span>
                </span>
                <span className="text-sm font-semibold text-teal-700">Открыть</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="panel mt-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">Заявки на подтверждение</h2>
          <Link href="/superadmin/companies" className="text-sm font-semibold text-teal-700">Все компании</Link>
        </div>
        <div className="mt-4 divide-y divide-slate-200">
          {pendingCompanies.slice(0, 6).map((company) => (
            <Link key={company.id} href={`/superadmin/companies/${company.id}`} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="font-semibold text-slate-950">{company.name}</span>
                <span className="ml-2 text-sm text-slate-500">{company.city}</span>
              </span>
              <span className="text-sm font-semibold text-teal-700">Открыть</span>
            </Link>
          ))}
          {pendingCompanies.length === 0 && <p className="py-3 text-slate-500">Новых заявок нет.</p>}
        </div>
      </section>
    </AdminShell>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
