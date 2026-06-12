import Link from "next/link";
import QRCode from "qrcode";
import { CompanyUserRole } from "@prisma/client";
import { CheckCircle2, Gift, QrCode, ScanLine, UserPlus, Users } from "lucide-react";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { RegistrationQrPoster } from "@/components/registration-qr-poster";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, statusClass, statusLabel } from "@/lib/format";
import { loyaltyTemplates } from "@/lib/loyalty-templates";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";
import { getCompanyRegistrationUrl } from "@/lib/request-url";

export default async function CompanyDashboardPage() {
  const access = await requireCompanyUser();
  const company = await refreshCompanySubscription(access.companyId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clientsTotal, operationsToday, operationsMonth, staffTotal] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: monthStart } } }),
    getDb().companyUser.count({ where: { companyId: access.companyId, isActive: true } }),
  ]);

  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const left = company?.status === "ACTIVE_TRIAL" ? daysLeft(company.trialEndsAt) : daysLeft(company?.paidUntil);
  const isCashier = access.role === CompanyUserRole.CASHIER;
  const clientUrl = await getCompanyRegistrationUrl(access.company.slug);
  const qrDataUrl = await QRCode.toDataURL(clientUrl, {
    width: 420,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const setupProgress = [
    { done: Boolean(access.company.loyaltyProgram), label: "Выбрать шаблон акции", href: "/company/settings" },
    { done: true, label: "Получить QR для клиентов", href: "/company/settings#registration-qr" },
    { done: staffTotal > 1, label: "Добавить кассира", href: "/company/staff" },
    { done: clientsTotal > 0, label: "Получить первого клиента", href: "/company/settings#registration-qr" },
    { done: operationsMonth > 0, label: "Сделать первое начисление", href: "/company/scan" },
  ];
  const completedSteps = setupProgress.filter((item) => item.done).length;

  if (isCashier) {
    return (
      <AdminShell title={access.company.name} subtitle="Рабочее место кассира." nav={companyNavForRole(access.role)}>
        {!active && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">
            Сервис временно недоступен из-за статуса подписки. Обратитесь к администратору компании.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Операций сегодня" value={operationsToday} />
          <Metric label="Операций за месяц" value={operationsMonth} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Action href="/company/scan" icon={<ScanLine aria-hidden className="size-6" />} title="Сканировать QR" text="Начислить покупку или выдать подарок клиенту." emphasis />
          <div className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Как работать</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Попросите клиента показать QR.</li>
              <li>2. Отсканируйте код или введите токен вручную.</li>
              <li>3. Нажмите одну кнопку: начислить покупку или выдать подарок.</li>
            </ol>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={access.company.name} subtitle="Панель запуска программы лояльности, QR для клиентов и статистика." nav={companyNavForRole(access.role)}>
      {!active && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">
          Сервис временно недоступен из-за статуса подписки. Данные сохранены, доступ восстановится после оплаты.
        </div>
      )}

      {active && company?.status === "ACTIVE_TRIAL" && (
        <div className="mb-5 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">
          Trial активен. Осталось дней: {left}. Распечатайте QR, поставьте его на стойку и сделайте первое тестовое начисление.
        </div>
      )}

      <section className="panel mb-6 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Первый запуск</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Чек-лист запуска: {completedSteps}/{setupProgress.length}</h2>
            <p className="mt-2 text-slate-600">Выполните эти шаги, чтобы за trial получить первых клиентов и понять ценность сервиса.</p>
          </div>
          <Link href="/company/settings#registration-qr" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 font-semibold text-white">
            <QrCode aria-hidden className="size-5" />
            Распечатать QR
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {setupProgress.map((item) => (
            <Link key={item.label} href={item.href} className={`rounded-lg border p-3 text-sm font-semibold ${item.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
              <CheckCircle2 aria-hidden className={`mb-2 size-5 ${item.done ? "text-emerald-700" : "text-slate-300"}`} />
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Статус подписки</p>
          <p className="mt-3"><span className={`badge ${statusClass(company?.status ?? access.company.status)}`}>{statusLabel(company?.status ?? access.company.status)}</span></p>
        </div>
        <Metric label="Дней осталось" value={left} />
        <Metric label="Клиентов всего" value={clientsTotal} />
        <Metric label="Операций сегодня" value={operationsToday} />
        <Metric label="Операций за месяц" value={operationsMonth} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Action href="/company/scan" icon={<ScanLine aria-hidden className="size-6" />} title="Сканер" text="Начислить покупку или выдать подарок." emphasis />
        <Action href="/company/settings#registration-qr" icon={<QrCode aria-hidden className="size-6" />} title="QR для клиентов" text="Скачать или распечатать QR-плакат." />
        <Action href="/company/staff" icon={<UserPlus aria-hidden className="size-6" />} title="Кассиры" text="Добавить сотрудника для сканирования." />
        <Action href="/company/clients" icon={<Users aria-hidden className="size-6" />} title="Клиенты" text="Прогресс, история и список клиентов." />
      </div>

      <section className="panel mt-6 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Быстрые шаблоны</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Настройте акцию без лишних решений</h2>
          </div>
          <Link href="/company/settings" className="text-sm font-semibold text-teal-700">Все настройки</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {loyaltyTemplates.slice(0, 6).map((template) => (
            <Link key={template.id} href={`/company/settings?template=${template.id}`} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <span className="text-3xl">{template.icon}</span>
                <Gift aria-hidden className="size-5 text-teal-700" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-950">{template.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{template.goalCount} покупок · {template.rewardTitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <RegistrationQrPoster
          companyName={access.company.name}
          clientUrl={clientUrl}
          qrDataUrl={qrDataUrl}
          rewardTitle={access.company.loyaltyProgram?.rewardTitle}
        />
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Action({ href, icon, title, text, emphasis = false }: { href: string; icon: React.ReactNode; title: string; text: string; emphasis?: boolean }) {
  return (
    <Link href={href} className={`panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${emphasis ? "bg-teal-700 text-white" : ""}`}>
      <div className={`flex size-12 items-center justify-center rounded-lg ${emphasis ? "bg-white/15 text-white" : "bg-teal-50 text-teal-700"}`}>{icon}</div>
      <h2 className={`mt-4 text-xl font-semibold ${emphasis ? "text-white" : "text-slate-950"}`}>{title}</h2>
      <p className={`mt-2 ${emphasis ? "text-white/80" : "text-slate-600"}`}>{text}</p>
    </Link>
  );
}
