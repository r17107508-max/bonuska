import { requestPaymentReview } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { TextAreaField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";
import { daysLeft, formatDate, money, statusClass, statusLabel } from "@/lib/format";
import { refreshCompanySubscription } from "@/lib/loyalty";
import { getSettings } from "@/lib/settings";

export default async function CompanyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const [settings, params, company] = await Promise.all([
    getSettings(),
    searchParams,
    refreshCompanySubscription(access.companyId),
  ]);
  const currentCompany = company ?? access.company;
  const left = currentCompany.status === "ACTIVE_TRIAL" ? daysLeft(currentCompany.trialEndsAt) : daysLeft(currentCompany.paidUntil);
  const periodEnd = currentCompany.status === "ACTIVE_TRIAL" ? currentCompany.trialEndsAt : currentCompany.paidUntil;

  return (
    <AdminShell title="Оплата подписки" subtitle="Продление доступа к сканеру, QR-картам и статистике компании." nav={companyNav}>
      {params.success && (
        <p className="mb-5 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">
          Сообщение об оплате отправлено суперадмину. После проверки статус подписки обновится.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="panel p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">Текущий статус</p>
              <p className="mt-3"><span className={`badge ${statusClass(currentCompany.status)}`}>{statusLabel(currentCompany.status)}</span></p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-right">
              <p className="text-sm font-semibold text-slate-500">Доступ до</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatDate(periodEnd)}</p>
              <p className="mt-1 text-sm text-slate-600">Осталось дней: {left}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[var(--brand-soft)] p-5 text-[var(--brand-ink)]">
            <p className="text-sm font-semibold uppercase">Тариф</p>
            <p className="mt-2 text-4xl font-semibold">{money(settings.subscriptionPrice)} <span className="text-lg text-[var(--brand-ink)]">/ месяц</span></p>
            <p className="mt-2 text-sm text-[var(--brand-ink)]">Без комиссии с покупок, без оплаты за каждого клиента. После подтверждения оплаты доступ продлевается на 30 дней.</p>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-slate-950">Как оплатить</h2>
            <ol className="mt-3 space-y-2 text-slate-700">
              <li>1. Переведите сумму по реквизитам ниже.</li>
              <li>2. В комментарии укажите название компании: {access.company.name}.</li>
              <li>3. Нажмите «Я оплатил» и при необходимости укажите детали платежа.</li>
              <li>4. Суперадмин проверит оплату и продлит доступ.</li>
            </ol>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">Реквизиты</h2>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{settings.paymentRequisites || "Реквизиты пока не заполнены. Свяжитесь с поддержкой сервиса."}</pre>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Сообщить об оплате</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Это не списывает деньги автоматически. Кнопка создаёт запрос для суперадмина, чтобы он быстрее нашёл и подтвердил платёж.</p>
            <form action={requestPaymentReview} className="mt-4 space-y-4">
              <TextAreaField label="Комментарий к оплате" name="comment" rows={4} placeholder="Например: оплатили 499 ₽ с карты, имя отправителя..." />
              <SubmitButton>Я оплатил</SubmitButton>
            </form>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Что будет, если trial закончится</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Данные клиентов и история сохранятся. Сканер и начисления будут ограничены до подтверждения оплаты.
            </p>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
