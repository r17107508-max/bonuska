import Link from "next/link";
import { CompanyStatus } from "@prisma/client";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";

export default async function SuperadminPage() {
  await requireSuperadmin();
  const db = getDb();
  const [companies, payments, operations, suspiciousAttempts] = await Promise.all([
    db.company.findMany({ include: { memberships: true, transactions: true } }),
    db.subscriptionPayment.findMany(),
    db.loyaltyTransaction.count(),
    db.auditLog.count({ where: { action: "SUSPICIOUS_REPEAT_PURCHASE" } }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyIncome = payments.filter((payment) => payment.paidAt >= monthStart).reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCompanies = companies.filter((company) => company.status === CompanyStatus.PENDING);
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

  return (
    <AdminShell title="Глобальная панель" subtitle="Состояние SaaS-платформы и быстрый контроль компаний." nav={superadminNav}>
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
