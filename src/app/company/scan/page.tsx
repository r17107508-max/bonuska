import { confirmPurchase, giveReward } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { QrScanner } from "@/components/scanner";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { requireCompanyUser } from "@/lib/auth";
import { findMembershipForScan, hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

export default async function CompanyScanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; success?: string }>;
}) {
  const access = await requireCompanyUser();
  const params = await searchParams;
  const company = await refreshCompanySubscription(access.companyId);
  const token = params.token ?? "";
  const membership = token ? await findMembershipForScan(access.companyId, token) : null;
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;

  return (
    <AdminShell title="Сканер QR" subtitle="Сканируйте QR клиента, подтверждайте покупку или выдачу подарка." nav={companyNav}>
      {!active && <p className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">Сервис временно недоступен из-за отсутствия оплаты или блокировки.</p>}
      {params.error && <p className="mb-5 rounded-lg bg-red-50 p-4 font-semibold text-red-800">{params.error}</p>}
      {params.success && <p className="mb-5 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">{params.success}</p>}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <QrScanner />

        <section className="space-y-5">
          {!token && <div className="panel p-5 text-slate-600">Отсканируйте QR-код или вставьте токен вручную.</div>}
          {token && !membership && <div className="panel p-5 text-red-700">Клиент не найден в этой компании.</div>}
          {membership && membership.company.loyaltyProgram && (
            <>
              <div className="panel p-5">
                <p className="text-sm font-semibold uppercase text-slate-500">Клиент</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{membership.user.name}</h2>
                <p className="text-slate-600">{membership.user.phone}</p>
              </div>
              <ProgressIcons
                icon={membership.company.loyaltyProgram.icon}
                current={membership.currentCount}
                goal={membership.company.loyaltyProgram.goalCount}
                rewardAvailable={membership.rewardAvailable}
                rewardTitle={membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}
              />
              {active && (
                <form action={membership.rewardAvailable ? giveReward : confirmPurchase} className="panel p-5">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="token" value={token} />
                  {membership.rewardAvailable ? (
                    <ConfirmSubmit title="Выдать подарок?" confirmText={`Кассир подтвердит выдачу: ${membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}. Прогресс будет сброшен.`} buttonText="Выдать подарок" />
                  ) : (
                    <ConfirmSubmit title="Начислить покупку?" confirmText="Проверьте, что клиент совершил покупку. Повторное начисление одному клиенту заблокировано на 30 секунд." buttonText="Подтвердить покупку" />
                  )}
                </form>
              )}
              <section>
                <h2 className="mb-3 text-xl font-semibold text-slate-950">Последние операции</h2>
                <HistoryList transactions={membership.transactions} />
              </section>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
