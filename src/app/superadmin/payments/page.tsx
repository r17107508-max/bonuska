import Link from "next/link";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime, money } from "@/lib/format";

export default async function SuperadminPaymentsPage() {
  await requireSuperadmin();
  const [payments, reviewRequests] = await Promise.all([
    getDb().subscriptionPayment.findMany({
      include: { company: true, confirmedBy: true },
      orderBy: { paidAt: "desc" },
    }),
    getDb().auditLog.findMany({
      where: { action: "PAYMENT_REVIEW_REQUESTED" },
      include: { company: true, actor: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AdminShell title="История оплат" subtitle="Запросы компаний на проверку оплаты и ручные подтверждения подписки." nav={superadminNav}>
      <section className="panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">Компании сообщили об оплате</h2>
          <span className="badge bg-amber-100 text-amber-800">{reviewRequests.length}</span>
        </div>
        <div className="mt-4 divide-y divide-slate-200">
          {reviewRequests.map((request) => (
            <div key={request.id} className="grid gap-3 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Link href={`/superadmin/companies/${request.companyId}`} className="font-semibold text-teal-700">
                  {request.company?.name ?? "Компания"}
                </Link>
                <p className="mt-1 text-slate-600">{formatDateTime(request.createdAt)} · {request.actor?.name ?? "пользователь"}</p>
                {request.metadataJson && <p className="mt-1 text-slate-500">{paymentRequestComment(request.metadataJson)}</p>}
              </div>
              <Link href={`/superadmin/companies/${request.companyId}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 font-semibold text-white">
                Открыть
              </Link>
            </div>
          ))}
          {reviewRequests.length === 0 && <p className="py-3 text-slate-500">Новых запросов на проверку оплаты нет.</p>}
        </div>
      </section>

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
                  <td className="px-4 py-3 text-slate-600">{formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}</td>
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

function paymentRequestComment(metadataJson: string) {
  try {
    const data = JSON.parse(metadataJson) as { comment?: string | null };
    return data.comment ? `Комментарий: ${data.comment}` : "Комментарий не указан.";
  } catch {
    return metadataJson;
  }
}
