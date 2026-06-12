import { notFound } from "next/navigation";
import type { AuditLog, User } from "@prisma/client";
import { approveCompany, blockCompany, extendCompany, markPayment, rejectCompany, unblockCompany } from "@/app/actions";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { InlineSubmit } from "@/components/buttons";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, formatDate, formatDateTime, money, statusClass, statusLabel } from "@/lib/format";
import { getSettings } from "@/lib/settings";

type SuspiciousLog = AuditLog & {
  actor: Pick<User, "id" | "name"> | null;
};

export default async function SuperadminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const [company, settings, suspiciousLogs] = await Promise.all([
    getDb().company.findUnique({
      where: { id },
      include: {
        users: { include: { user: true } },
        memberships: true,
        transactions: { take: 20, orderBy: { createdAt: "desc" } },
        payments: { include: { confirmedBy: true }, orderBy: { paidAt: "desc" } },
        offerAcceptances: { include: { user: true }, orderBy: { acceptedAt: "desc" } },
        auditLogs: {
          where: { entityType: "EmailNotification" },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    getSettings(),
    getDb().auditLog.findMany({
      where: { companyId: id, action: "SUSPICIOUS_REPEAT_PURCHASE" },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
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
                  <span>{formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}</span>
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
            <h2 className="text-xl font-semibold text-slate-950">Email-уведомления</h2>
            <div className="mt-3 space-y-3 text-sm">
              {company.auditLogs.map((log) => (
                <div key={log.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">{emailAuditLabel(log.action)}</p>
                  <p className="text-slate-500">{formatDateTime(log.createdAt)}</p>
                  {log.metadataJson && <p className="mt-1 break-all text-slate-600">{emailAuditSummary(log.metadataJson)}</p>}
                </div>
              ))}
              {company.auditLogs.length === 0 && <p className="text-sm text-slate-500">Email-уведомлений пока нет.</p>}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Подозрительные операции</h2>
            <div className="mt-3 space-y-3 text-sm">
              {suspiciousLogs.map((log) => (
                <SuspiciousAuditCard key={log.id} log={log} />
              ))}
              {suspiciousLogs.length === 0 && <p className="text-sm text-slate-500">Подозрительных операций пока нет.</p>}
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
              {company.offerAcceptances.length === 0 && <p className="text-sm text-slate-500">Принятий оферты пока нет.</p>}
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

function SuspiciousAuditCard({ log }: { log: SuspiciousLog }) {
  const meta = suspiciousAuditSummary(log.metadataJson);

  return (
    <div className="rounded-lg bg-red-50 p-3 text-red-900">
      <p className="font-semibold">{meta.customerName || "Повторное начисление"}</p>
      <p className="text-red-800/80">{meta.customerPhone || "Телефон не указан"}</p>
      <p className="mt-1 text-red-800/80">Кассир: {log.actor?.name ?? "неизвестно"}</p>
      <p className="text-red-800/80">{formatDateTime(log.createdAt)}</p>
    </div>
  );
}

function suspiciousAuditSummary(metadataJson: string | null) {
  if (!metadataJson) {
    return {};
  }

  try {
    return JSON.parse(metadataJson) as {
      customerName?: string | null;
      customerPhone?: string | null;
    };
  } catch {
    return {};
  }
}

function emailAuditLabel(action: string) {
  const labels: Record<string, string> = {
    EMAIL_SUPERADMIN_APPLICATION_SENT: "Суперадмину отправлено письмо о новой заявке",
    EMAIL_SUPERADMIN_APPLICATION_SKIPPED: "Письмо суперадмину не отправлено",
    EMAIL_SUPERADMIN_APPLICATION_FAILED: "Ошибка письма суперадмину",
    EMAIL_COMPANY_APPROVED_SENT: "Компании отправлено письмо об одобрении",
    EMAIL_COMPANY_APPROVED_SKIPPED: "Письмо компании не отправлено",
    EMAIL_COMPANY_APPROVED_FAILED: "Ошибка письма компании",
  };

  return labels[action] ?? action;
}

function emailAuditSummary(metadataJson: string) {
  try {
    const data = JSON.parse(metadataJson) as { recipients?: string[]; reason?: string };
    const recipients = data.recipients?.length ? `Получатели: ${data.recipients.join(", ")}.` : "";
    const reason = data.reason ? ` Причина: ${data.reason}.` : "";
    return `${recipients}${reason}`.trim() || metadataJson;
  } catch {
    return metadataJson;
  }
}
