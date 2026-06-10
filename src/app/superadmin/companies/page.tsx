import Link from "next/link";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDate, statusClass, statusLabel } from "@/lib/format";

export default async function SuperadminCompaniesPage() {
  await requireSuperadmin();
  const companies = await getDb().company.findMany({
    include: { memberships: true, transactions: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell title="Компании" subtitle="Заявки, подписки, блокировки и операционная статистика." nav={superadminNav}>
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
                  <td className="px-4 py-3 font-semibold text-slate-950">{company.name}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusClass(company.status)}`}>{statusLabel(company.status)}</span></td>
                  <td className="px-4 py-3 text-slate-600">{company.businessType}</td>
                  <td className="px-4 py-3 text-slate-600">{company.city}</td>
                  <td className="px-4 py-3 text-slate-600">{company.memberships.length}</td>
                  <td className="px-4 py-3 text-slate-600">{company.transactions.length}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(company.trialEndsAt)} · {daysLeft(company.trialEndsAt)} дн.</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(company.paidUntil)} · {daysLeft(company.paidUntil)} дн.</td>
                  <td className="px-4 py-3"><Link href={`/superadmin/companies/${company.id}`} className="font-semibold text-teal-700">Открыть</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
