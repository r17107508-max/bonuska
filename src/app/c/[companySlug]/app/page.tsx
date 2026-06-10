import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { HistoryList } from "@/components/history-list";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { ProgressIcons } from "@/components/progress-cups";
import { QrCard } from "@/components/qr-card";
import { requireCustomerMembership } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

export default async function CustomerAppPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const membership = await requireCustomerMembership(companySlug);
  if (!membership.company.loyaltyProgram) {
    redirect(`/c/${companySlug}`);
  }

  const company = await refreshCompanySubscription(membership.companyId);
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const program = membership.company.loyaltyProgram;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <section className="mx-auto max-w-md space-y-5">
        <header className="panel p-5 text-white" style={{ backgroundColor: program.themeColor }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold opacity-80">{membership.company.businessType}</p>
              <h1 className="mt-1 text-3xl font-semibold">{membership.company.name}</h1>
              <p className="mt-2 text-sm opacity-85">Клиент: {membership.user.name}</p>
            </div>
            <span className="text-5xl">{program.icon}</span>
          </div>
        </header>

        {!active && (
          <div className="rounded-lg bg-red-50 p-4 font-semibold text-red-800">
            Сервис временно недоступен из-за отсутствия оплаты компанией. Данные и прогресс сохранены.
          </div>
        )}

        <QrCard token={membership.qrToken} color={program.themeColor} />
        <InstallPwaButton />
        <ProgressIcons icon={program.icon} current={membership.currentCount} goal={program.goalCount} rewardAvailable={membership.rewardAvailable} rewardTitle={membership.pendingReward ?? program.rewardTitle} />

        {membership.rewardAvailable && (
          <div className="panel p-5 text-center">
            <p className="text-5xl">🎁</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Подарок доступен</h2>
            <p className="mt-1 text-slate-600">{membership.pendingReward ?? program.rewardTitle}. Покажите QR-код кассиру.</p>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">История покупок</h2>
          <HistoryList transactions={membership.transactions} emptyText="Покупок пока нет" />
        </section>

        <section className="panel p-4 text-sm text-slate-600">
          <p>Дата регистрации: {formatDate(membership.createdAt)}</p>
          <p className="mt-1">QR-токен не содержит телефон. В будущем его можно заменить на динамический токен 30–60 секунд.</p>
        </section>

        <form action={logout}>
          <button type="submit" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700">Выйти</button>
        </form>
      </section>
    </main>
  );
}
