import Link from "next/link";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime, money } from "@/lib/format";

export default async function SuperadminPaymentsPage() {
  await requireSuperadmin();
  const payments = await getDb().subscriptionPayment.findMany({
    include: { company: true, confirmedBy: true },
    orderBy: { paidAt: "desc" },
  });

  return (
    <AdminShell title="История оплат" subtitle="Ручные подтверждения подписки и оплаченные периоды." nav={superadminNav}>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Компания</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Оплачено</th>
                <th className="px-4 py-3">Период</th>
                <th className="px-4 py-3">Подтвердил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="bg-white">
                  <td className="px-4 py-3"><Link href={`/superadmin/companies/${payment.companyId}`} className="font-semibold text-teal-700">{payment.company.name}</Link></td>
                  <td className="px-4 py-3 font-semibold">{money(payment.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(payment.periodStart)} — {formatDate(payment.periodEnd)}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.confirmedBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="p-5 text-slate-500">Оплат пока нет.</p>}
        </div>
      </div>
    </AdminShell>
  );
}
