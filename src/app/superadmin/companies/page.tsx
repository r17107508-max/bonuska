import Link from "next/link";
import { CompanyStatus } from "@prisma/client";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDate, statusClass, statusLabel } from "@/lib/format";

const statusOptions = [
  { value: "ALL", label: "Все статусы" },
  ...Object.values(CompanyStatus).map((status) => ({ value: status, label: statusLabel(status) })),
];

export default async function SuperadminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireSuperadmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const selectedStatus = Object.values(CompanyStatus).includes(params.status as CompanyStatus)
    ? (params.status as CompanyStatus)
    : null;

  const companies = await getDb().company.findMany({
    where: {
      ...(selectedStatus ? { status: selectedStatus } : { status: { not: CompanyStatus.DELETED } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { slug: { contains: q } },
              { city: { contains: q } },
              { businessType: { contains: q } },
              { ownerName: { contains: q } },
              { ownerPhone: { contains: q.replace(/\D/g, "") || q } },
              { ownerEmail: { contains: q } },
            ],
          }
        : {}),
    },
    include: { memberships: true, transactions: true },
    orderBy: { createdAt: "desc" },
  });

  const attention = {
    pending: companies.filter((company) => company.status === CompanyStatus.PENDING).length,
    expiringTrial: companies.filter((company) => company.status === CompanyStatus.ACTIVE_TRIAL && daysLeft(company.trialEndsAt) <= 3).length,
    paymentRequired: companies.filter((company) => company.status === CompanyStatus.PAYMENT_REQUIRED).length,
  };

  return (
    <AdminShell title="Компании" subtitle="Заявки, подписки, блокировки и операционная статистика." nav={superadminNav}>
      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <AttentionLink href="/superadmin/companies?status=PENDING" label="Заявки на проверку" value={attention.pending} tone="warning" />
        <AttentionLink href="/superadmin/companies?status=ACTIVE_TRIAL" label="Trial заканчивается" value={attention.expiringTrial} tone="info" />
        <AttentionLink href="/superadmin/companies?status=PAYMENT_REQUIRED" label="Нужна оплата" value={attention.paymentRequired} tone="danger" />
      </section>

      <form className="panel mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_240px_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск: название, город, владелец, телефон, email"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
        />
        <select
          name="status"
          defaultValue={selectedStatus ?? "ALL"}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="min-h-11 rounded-lg bg-[var(--brand)] px-5 font-semibold text-white">Показать</button>
      </form>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Город</th>
                <th className="px-4 py-3">Клиенты</th>
                <th className="px-4 py-3">Операции</th>
                <th className="px-4 py-3">Trial до</th>
                <th className="px-4 py-3">Оплачено до</th>
                <th className="px-4 py-3">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {companies.map((company) => (
                <tr key={company.id} className="bg-white">
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    <div>{company.name}</div>
                    <div className="text-xs font-medium text-slate-500">/c/{company.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusClass(company.status)}`}>{statusLabel(company.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{company.businessType}</td>
                  <td className="px-4 py-3 text-slate-600">{company.city}</td>
                  <td className="px-4 py-3 text-slate-600">{company.memberships.length}</td>
                  <td className="px-4 py-3 text-slate-600">{company.transactions.length}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(company.trialEndsAt)} · {daysLeft(company.trialEndsAt)} дн.</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(company.paidUntil)} · {daysLeft(company.paidUntil)} дн.</td>
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/companies/${company.id}`} className="font-semibold text-[var(--brand)]">Открыть</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && <p className="p-5 text-slate-500">Компании по выбранным условиям не найдены.</p>}
        </div>
      </div>
    </AdminShell>
  );
}

function AttentionLink({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: "warning" | "info" | "danger";
}) {
  const tones = {
    warning: "bg-[var(--inactive)] text-[#7a4b00] ring-[var(--border)]",
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    danger: "bg-rose-50 text-rose-900 ring-rose-200",
  };

  return (
    <Link href={href} className={`rounded-lg p-4 ring-1 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
}
