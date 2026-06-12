import { AlertTriangle, CheckCircle2, UserRound } from "lucide-react";
import { confirmPurchase, giveReward, joinScannedCustomerAndConfirmPurchase } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { QrScanner } from "@/components/scanner";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { requireCompanyUser } from "@/lib/auth";
import { findCustomerForGlobalScan, findMembershipForScan, hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

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
  const globalCustomerWithoutMembership = token && !membership ? await findCustomerForGlobalScan(access.companyId, token) : null;
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;

  return (
    <AdminShell title="Сканер QR" subtitle="Рабочий экран кассира: сканируйте QR, начисляйте покупки и выдавайте подарки." nav={companyNavForRole(access.role)}>
      {!active && <Notice tone="danger" text="Сервис временно недоступен из-за отсутствия оплаты или блокировки. Начисления закрыты." />}
      {params.error && <Notice tone="danger" text={params.error} />}
      {params.success && <Notice tone="success" text={params.success} />}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <QrScanner />

        <section className="space-y-5">
          {!token && (
            <div className="panel p-5 text-slate-700">
              <h2 className="text-xl font-semibold text-slate-950">Ожидаем QR клиента</h2>
              <p className="mt-2">Отсканируйте QR-код или введите токен вручную. После этого здесь появится карточка клиента и кнопка действия.</p>
            </div>
          )}

          {token && !membership && !globalCustomerWithoutMembership && (
            <div className="panel p-5 text-red-700">
              <h2 className="text-xl font-semibold">Клиент не найден</h2>
              <p className="mt-2 text-sm">Этот QR не найден. Попросите клиента открыть общий кабинет Проплюшек или отсканировать QR-плакат компании.</p>
            </div>
          )}

          {globalCustomerWithoutMembership && (
            <div className="panel p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <UserRound aria-hidden className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">Новый клиент для вашей компании</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{globalCustomerWithoutMembership.name}</h2>
                  <p className="text-slate-600">{globalCustomerWithoutMembership.phone}</p>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                Клиент уже зарегистрирован в Проплюшках, но ещё не участвует в программе вашей компании.
              </p>
              {active && (
                <form action={joinScannedCustomerAndConfirmPurchase} className="mt-4">
                  <input type="hidden" name="token" value={token} />
                  <ConfirmSubmit
                    title="Подключить клиента?"
                    confirmText="Клиент будет подключён к программе вашей компании, после этого первая покупка будет начислена."
                    buttonText="Подключить и начислить покупку"
                  />
                </form>
              )}
            </div>
          )}

          {membership && membership.company.loyaltyProgram && (
            <>
              <div className="panel p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <UserRound aria-hidden className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase text-slate-500">Клиент</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{membership.user.name}</h2>
                    <p className="text-slate-600">{membership.user.phone}</p>
                  </div>
                </div>
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
                  <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">Проверьте перед нажатием</p>
                    <ul className="mt-2 space-y-1">
                      <li>Клиент совершил покупку сейчас.</li>
                      <li>QR принадлежит этой компании.</li>
                      <li>Повторное начисление одному клиенту временно блокируется.</li>
                    </ul>
                  </div>
                  {membership.rewardAvailable ? (
                    <ConfirmSubmit
                      title="Выдать подарок?"
                      confirmText={`Подтвердите выдачу: ${membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}. После выдачи прогресс клиента сбросится.`}
                      buttonText="Выдать подарок"
                    />
                  ) : (
                    <ConfirmSubmit
                      title="Начислить покупку?"
                      confirmText="Подтвердите, что клиент действительно совершил покупку. Повторное начисление одному клиенту временно блокируется."
                      buttonText="Начислить покупку"
                    />
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

function Notice({ tone, text }: { tone: "success" | "danger"; text: string }) {
  const success = tone === "success";

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-lg p-4 font-semibold ${success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
      {success ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />}
      <p>{text}</p>
    </div>
  );
}
