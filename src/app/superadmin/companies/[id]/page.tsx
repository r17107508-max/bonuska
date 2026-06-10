import { notFound } from "next/navigation";
import { approveCompany, blockCompany, extendCompany, markPayment, rejectCompany, unblockCompany } from "@/app/actions";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { InlineSubmit } from "@/components/buttons";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDate, formatDateTime, money, statusClass, statusLabel } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function SuperadminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const [company, settings] = await Promise.all([
    getDb().company.findUnique({
      where: { id },
      include: {
        users: { include: { user: true } },
        memberships: true,
        transactions: { take: 20, orderBy: { createdAt: "desc" } },
        payments: { include: { confirmedBy: true }, orderBy: { paidAt: "desc" } },
        offerAcceptances: { include: { user: true }, orderBy: { acceptedAt: "desc" } },
      },
    }),
    getSettings(),
  ]);

  if (!company) {
    notFound();
  }

  const action = (handler: (formData: FormData) => Promise<void>, label: string, variant?: "primary" | "secondary" | "danger") => (
    <form action={handler}>
      <input type="hidden" name="companyId" value={company.id} />
      <InlineSubmit variant={variant}>{label}</InlineSubmit>
    </form>
  );

  return (
    <AdminShell title={company.name} subtitle="Карточка компании, подписка, владелец и ручные действия." nav={superadminNav}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`badge ${statusClass(company.status)}`}>{statusLabel(company.status)}</span>
            <span className="badge bg-slate-100 text-slate-700">{company.businessType}</span>
            <span className="badge bg-slate-100 text-slate-700">{company.city}</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Дата регистрации" value={formatDateTime(company.createdAt)} />
            <Info label="Дата начала trial" value={formatDateTime(company.trialStartedAt)} />
            <Info label="Trial до" value={`${formatDate(company.trialEndsAt)} · ${daysLeft(company.trialEndsAt)} дн.`} />
            <Info label="Оплачено до" value={`${formatDate(company.paidUntil)} · ${daysLeft(company.paidUntil)} дн.`} />
            <Info label="Последняя оплата" value={formatDateTime(company.lastPaidAt)} />
            <Info label="Клиентов" value={String(company.memberships.length)} />
            <Info label="Операций" value={String(company.transactions.length)} />
            <Info label="Slug" value={`/c/${company.slug}`} />
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-950">Владелец</h2>
            <p className="mt-2 text-slate-700">{company.ownerName}</p>
            <p className="text-slate-600">{company.ownerPhone} · {company.ownerEmail}</p>
            <p className="text-slate-600">ИНН: {company.inn || "не указан"}</p>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold text-slate-950">История оплат</h2>
            <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {company.payments.map((payment) => (
                <div key={payment.id} className="grid gap-2 p-3 text-sm sm:grid-cols-4">
                  <span className="font-semibold">{money(payment.amount)}</span>
                  <span>{formatDate(payment.periodStart)} — {formatDate(payment.periodEnd)}</span>
                  <span>{formatDateTime(payment.paidAt)}</span>
                  <span>{payment.confirmedBy.name}</span>
                </div>
              ))}
              {company.payments.length === 0 && <p className="p-3 text-sm text-slate-500">Оплат пока нет.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Действия</h2>
            <div className="mt-4 grid gap-3">
              {action(approveCompany, "Подтвердить")}
              {action(rejectCompany, "Отклонить", "danger")}
              {action(blockCompany, "Заблокировать", "danger")}
              {action(unblockCompany, "Разблокировать", "secondary")}
              {action(markPayment, `Отметить оплату ${money(settings.subscriptionPrice)}`)}
              {action(extendCompany, "Продлить на 30 дней", "secondary")}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Принятие оферты</h2>
            <div className="mt-3 space-y-3 text-sm">
              {company.offerAcceptances.map((acceptance) => (
                <div key={acceptance.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold">{acceptance.user.name} · v{acceptance.offerVersion}</p>
                  <p className="text-slate-500">{formatDateTime(acceptance.acceptedAt)}</p>
                  <p className="text-slate-500">{acceptance.ip}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-950">{value}</p>
    </div>
  );
}
