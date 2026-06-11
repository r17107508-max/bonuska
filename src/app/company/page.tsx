import Link from "next/link";
import QRCode from "qrcode";
import { CompanyUserRole } from "@prisma/client";
import { QrCode, ScanLine, Settings, Users } from "lucide-react";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { RegistrationQrPoster } from "@/components/registration-qr-poster";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { daysLeft, statusClass, statusLabel } from "@/lib/format";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";
import { getCompanyRegistrationUrl } from "@/lib/request-url";

export default async function CompanyDashboardPage() {
  const access = await requireCompanyUser();
  const company = await refreshCompanySubscription(access.companyId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clientsTotal, operationsToday, operationsMonth] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, createdAt: { gte: monthStart } } }),
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

  return (
    <AdminShell title={access.company.name} subtitle={isCashier ? "Рабочее место кассира." : "Панель компании: быстрые действия, подписка и статистика."} nav={companyNavForRole(access.role)}>
      {!active && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">
          Сервис временно недоступен из-за статуса подписки. Данные сохранены, доступ восстановится после оплаты.
        </div>
      )}

      {!isCashier && active && company?.status === "ACTIVE_TRIAL" && (
        <div className="mb-5 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">
          Компания одобрена. Пробный период активен, можно распечатать QR ниже и начать регистрацию клиентов.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Статус подписки</p>
          <p className="mt-3"><span className={`badge ${statusClass(company?.status ?? access.company.status)}`}>{statusLabel(company?.status ?? access.company.status)}</span></p>
        </div>
        <Metric label="Дней осталось" value={left} />
        <Metric label="Клиентов всего" value={clientsTotal} />
        <Metric label="Операций сегодня" value={operationsToday} />
        <Metric label="Операций за месяц" value={operationsMonth} />
      </div>

      <div className={`mt-6 grid gap-4 ${isCashier ? "md:grid-cols-1" : "md:grid-cols-4"}`}>
        <Action href="/company/scan" icon={<ScanLine aria-hidden className="size-6" />} title="Сканировать QR" text="Начислить покупку или выдать подарок." />
        {!isCashier && (
          <>
            <Action href="/company/settings#registration-qr" icon={<QrCode aria-hidden className="size-6" />} title="QR для клиентов" text="Скачать или распечатать QR-плакат." />
            <Action href="/company/clients" icon={<Users aria-hidden className="size-6" />} title="Клиенты" text="Поиск, прогресс и история операций." />
            <Action href="/company/settings" icon={<Settings aria-hidden className="size-6" />} title="Настройки акции" text="Иконка, цель, подарок, ссылка и QR-плакат." />
          </>
        )}
      </div>

      {!isCashier && (
        <div className="mt-6">
          <RegistrationQrPoster
            companyName={access.company.name}
            clientUrl={clientUrl}
            qrDataUrl={qrDataUrl}
            rewardTitle={access.company.loyaltyProgram?.rewardTitle}
          />
        </div>
      )}
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

function Action({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex size-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">{icon}</div>
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-slate-600">{text}</p>
    </Link>
  );
}
