import { requestPaymentReview } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { CopyButton } from "@/components/copy-button";
import { TextAreaField } from "@/components/form-field";
import { StatusPill, WorkspaceCard } from "@/components/company-ui";
import { requireCompanyAdmin } from "@/lib/auth";
import { daysLeft, formatDate, formatDateTime, money, statusClass, statusLabel } from "@/lib/format";
import { refreshCompanySubscription } from "@/lib/loyalty";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function CompanyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const [settings, params, company, lastPaymentRequest] = await Promise.all([
    getSettings(),
    searchParams,
    refreshCompanySubscription(access.companyId),
    getDb().auditLog.findFirst({
      where: { companyId: access.companyId, action: "PAYMENT_REVIEW_REQUESTED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const currentCompany = company ?? access.company;
  const left = currentCompany.status === "ACTIVE_TRIAL" ? daysLeft(currentCompany.trialEndsAt) : daysLeft(currentCompany.paidUntil);
  const periodEnd = currentCompany.status === "ACTIVE_TRIAL" ? currentCompany.trialEndsAt : currentCompany.paidUntil;
  const paymentStatus = currentCompany.status === "ACTIVE_PAID"
    ? "Подтверждено"
    : lastPaymentRequest
      ? "Проверяется"
      : "Не отправлено";

  return (
    <AdminShell title="Подписка и оплата" subtitle="Текущий тариф, статус доступа и ручное уведомление об оплате." nav={companyNav}>
      {params.success && (
        <p className="mb-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Сообщение об оплате отправлено. После проверки статус подписки обновится.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <WorkspaceCard>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase text-[var(--text-muted)]">Текущий тариф</p>
                <h2 className="mt-1 text-3xl font-extrabold text-[var(--text)]">ПроПлюшка для бизнеса</h2>
                <p className="mt-3"><span className={`badge ${statusClass(currentCompany.status)}`}>{statusLabel(currentCompany.status)}</span></p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--inactive)] p-4 sm:text-right">
                <p className="text-sm font-bold text-[var(--text-muted)]">Доступ до</p>
                <p className="mt-1 text-xl font-extrabold text-[var(--text)]">{formatDate(periodEnd)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Осталось дней: {left}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info label="Стоимость" value={`${money(settings.subscriptionPrice)} / месяц`} />
              <Info label="Клиенты" value="без комиссии" />
              <Info label="QR и отчёты" value="включены" />
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="font-bold text-[var(--text)]">Что входит</p>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--text-muted)] sm:grid-cols-2">
                <p>QR-регистрация клиентов</p>
                <p>Сканер кассира</p>
                <p>Начисление покупок</p>
                <p>Выдача подарков</p>
                <p>Сотрудники и роли</p>
                <p>Отчёты и розыгрыши</p>
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard>
            <h2 className="text-2xl font-extrabold text-[var(--text)]">Ручная оплата</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Автоматическая платёжная интеграция в backend не найдена, поэтому сохранён текущий ручной процесс.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-[var(--brand-strong)]">
                <p className="text-sm font-bold uppercase">Сумма к оплате</p>
                <p className="mt-1 text-3xl font-extrabold">{money(settings.subscriptionPrice)}</p>
              </div>
              <CopyButton text={settings.paymentRequisites || ""}>Скопировать реквизиты</CopyButton>
            </div>

            <details className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
              <summary className="cursor-pointer list-none p-4 font-bold text-[var(--text)] [&::-webkit-details-marker]:hidden">Полные реквизиты</summary>
              <pre className="whitespace-pre-wrap break-words border-t border-[var(--border)] bg-[var(--inactive)] p-4 text-sm text-[var(--text)]">{settings.paymentRequisites || "Реквизиты пока не заполнены. Свяжитесь с поддержкой сервиса."}</pre>
            </details>
          </WorkspaceCard>
        </div>

        <aside className="space-y-5">
          <WorkspaceCard>
            <h2 className="text-xl font-extrabold text-[var(--text)]">Сообщить об оплате</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Кнопка создаёт запрос для проверки супер-админом. Деньги автоматически не списываются.</p>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-3">
              <p className="text-sm font-bold text-[var(--text-muted)]">Статус проверки</p>
              <div className="mt-2"><StatusPill tone={paymentStatus === "Подтверждено" ? "success" : paymentStatus === "Проверяется" ? "warning" : "neutral"}>{paymentStatus}</StatusPill></div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Дата отправки: {formatDateTime(lastPaymentRequest?.createdAt)}</p>
            </div>
            <form action={requestPaymentReview} className="mt-4 space-y-4">
              <TextAreaField label="Комментарий" name="comment" rows={4} placeholder="Например: оплатили 4990 рублей, отправитель Иван Петров" />
              <SubmitButton>Сообщить об оплате</SubmitButton>
            </form>
          </WorkspaceCard>
        </aside>
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-bold text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-extrabold text-[var(--text)]">{value}</p>
    </div>
  );
}
