import { CompanyUserRole, LoyaltyProgramType, RewardClaimStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Gift, UserRound } from "lucide-react";
import { confirmPurchase, giveReward, joinScannedCustomerAndConfirmPurchase, redeemRewardClaim } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { QrScanner } from "@/components/scanner";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { statusLabel } from "@/lib/format";
import { findCustomerForGlobalScan, findMembershipForScan, findRewardClaimForScan, hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

export default async function CompanyScanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; success?: string; q?: string }>;
}) {
  const access = await requireCompanyUser();
  const params = await searchParams;
  const company = await refreshCompanySubscription(access.companyId);
  const token = params.token ?? "";
  const rewardClaim = token ? await findRewardClaimForScan(token) : null;
  const membership = token && !rewardClaim ? await findMembershipForScan(access.companyId, token) : null;
  const globalCustomerWithoutMembership = token && !membership && !rewardClaim ? await findCustomerForGlobalScan(access.companyId, token) : null;
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const isCashier = access.role === CompanyUserRole.CASHIER;
  const q = params.q?.trim() ?? "";
  const manualMatches = q
    ? await getDb().customerMembership.findMany({
        where: {
          companyId: access.companyId,
          user: {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
            ],
          },
        },
        include: {
          user: true,
          company: { include: { loyaltyProgram: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      })
    : [];
  const scannedMembershipUsesGiftBox = Boolean(
    membership?.company.loyaltyProgram &&
      (membership.company.loyaltyProgram.programType === LoyaltyProgramType.GIFT_BOX || membership.company.loyaltyProgram.isGiftBoxEnabled),
  );
  const openedRewardClaim = membership && scannedMembershipUsesGiftBox
    ? await getDb().rewardClaim.findFirst({
        where: {
          companyId: access.companyId,
          membershipId: membership.id,
          status: RewardClaimStatus.OPENED,
        },
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      })
    : null;

  return (
    <AdminShell
      title="Сканер QR"
      subtitle="Рабочий экран кассира: сканируйте QR, начисляйте покупки и выдавайте подарки."
      nav={companyNavForRole(access.role)}
      cashier={isCashier ? { companyName: access.company.name, status: statusLabel(company?.status ?? access.company.status) } : undefined}
    >
      {!active && <Notice tone="danger" text="Сервис временно недоступен из-за отсутствия оплаты или блокировки. Начисления закрыты." />}
      {params.error && <Notice tone="danger" text={params.error} />}
      {params.success && <Notice tone="success" text={params.success} />}

      {active && rewardClaim && (
        <section className={`panel mb-5 border-2 p-5 ${rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.OPENED ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
              <Gift aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-amber-800">Подарочный QR распознан</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Подарок клиента</h2>
              <p className="mt-1 text-sm text-slate-700">Проверьте подарок и подтвердите выдачу только после передачи клиенту.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">{rewardClaim.user.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p><span className="font-semibold">Компания:</span> {rewardClaim.company.name}</p>
                <p><span className="font-semibold">Подарок:</span> {rewardClaim.title ?? "пока не открыт"}</p>
                {rewardClaim.description && <p><span className="font-semibold">Описание:</span> {rewardClaim.description}</p>}
                <p><span className="font-semibold">Статус:</span> {rewardClaimStatusText(rewardClaim.status)}</p>
                {rewardClaim.openedAt && <p><span className="font-semibold">Открыт:</span> {rewardClaim.openedAt.toLocaleString("ru-RU")}</p>}
                {rewardClaim.redeemedAt && <p><span className="font-semibold">Выдан:</span> {rewardClaim.redeemedAt.toLocaleString("ru-RU")}</p>}
                {rewardClaim.redeemedBy && <p><span className="font-semibold">Кассир:</span> {rewardClaim.redeemedBy.name}</p>}
              </div>
              {rewardClaim.companyId !== access.companyId && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">Этот подарок не относится к вашей компании.</p>
              )}
              {rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.REDEEMED && (
                <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-700">Этот подарок уже был выдан.</p>
              )}
              {rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.AVAILABLE && (
                <p className="mt-4 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-900">Клиент ещё не открыл подарок.</p>
              )}
            </div>
            {rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.OPENED && (
              <form action={redeemRewardClaim}>
                <input type="hidden" name="token" value={token} />
                <ConfirmSubmit
                  title="Выдать подарок?"
                  confirmText={`Подтвердите выдачу: ${rewardClaim.title ?? "Подарок"}. После выдачи прогресс клиента сбросится, а QR станет недействительным.`}
                  buttonText="Выдать подарок"
                />
              </form>
            )}
          </div>
        </section>
      )}

      {active && membership && membership.company.loyaltyProgram && (
        <section className="panel mb-5 border-2 border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-semibold uppercase text-teal-800">QR распознан</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{membership.user.name}</h2>
              <p className="text-sm text-slate-700">
                {membership.currentCount} из {membership.company.loyaltyProgram.goalCount}
                {membership.rewardAvailable ? " · подарок доступен" : " · можно начислить покупку"}
              </p>
            </div>
            <div className="w-full sm:w-72">
              {membership.rewardAvailable && scannedMembershipUsesGiftBox && openedRewardClaim ? (
                <div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950">
                  <p className="font-semibold">🎁 У клиента есть открытый подарок</p>
                  <p className="mt-1 font-semibold">{openedRewardClaim.title ?? "Подарок"}</p>
                  {openedRewardClaim.description && <p className="mt-1">{openedRewardClaim.description}</p>}
                  <form action={redeemRewardClaim} className="mt-3">
                    <input type="hidden" name="token" value={openedRewardClaim.token} />
                    <ConfirmSubmit
                      title="Выдать подарок?"
                      confirmText={`Подтвердите выдачу: ${openedRewardClaim.title ?? "Подарок"}. После выдачи прогресс клиента сбросится, а QR станет недействительным.`}
                      buttonText="Выдать подарок"
                    />
                  </form>
                </div>
              ) : membership.rewardAvailable && scannedMembershipUsesGiftBox ? (
                <div className="rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">
                  Попросите клиента открыть подарок и показать подарочный QR-код. По обычному QR видно только прогресс карты.
                </div>
              ) : membership.rewardAvailable ? (
                <form action={giveReward}>
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="token" value={token} />
                  <ConfirmSubmit
                    title="Выдать подарок?"
                    confirmText={`Подтвердите выдачу: ${membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}. После выдачи прогресс клиента сбросится.`}
                    buttonText="Выдать подарок"
                  />
                </form>
              ) : (
                <form action={confirmPurchase}>
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="token" value={token} />
                  <ConfirmSubmit
                    title="Начислить покупку?"
                    confirmText="Подтвердите, что клиент совершил покупку сейчас. Повторное начисление одному клиенту временно блокируется."
                    buttonText="Начислить покупку"
                  />
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {active && globalCustomerWithoutMembership && (
        <form action={joinScannedCustomerAndConfirmPurchase} className="panel mb-5 border-2 border-amber-200 bg-amber-50 p-5">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm font-semibold uppercase text-amber-900">Новый клиент для этой компании</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{globalCustomerWithoutMembership.name}</h2>
              <p className="text-sm text-slate-700">Подключить к программе и сразу начислить покупку.</p>
            </div>
            <div className="w-full sm:w-80">
              <ConfirmSubmit
                title="Подключить клиента?"
                confirmText="Клиент будет подключён к программе вашей компании, после этого первая покупка будет начислена."
                buttonText="Подключить и начислить"
              />
            </div>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <QrScanner />

        <section className="space-y-5">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Ручной поиск клиента</h2>
            <p className="mt-2 text-sm text-slate-600">Если камера не сработала, найдите клиента по имени или телефону внутри вашей компании.</p>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                name="q"
                defaultValue={q}
                placeholder="Имя или телефон"
                className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
              />
              <button className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white">Найти</button>
            </form>
            {q && (
              <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {manualMatches.map((item) => (
                  <a key={item.id} href={`/company/scan?token=${encodeURIComponent(`tega:${item.qrToken}`)}`} className="flex items-center justify-between gap-3 p-3">
                    <span>
                      <span className="font-semibold text-slate-950">{item.user.name}</span>
                      <span className="ml-2 text-sm text-slate-500">{item.user.phone}</span>
                    </span>
                    <span className="text-sm font-semibold text-teal-700">Открыть</span>
                  </a>
                ))}
                {manualMatches.length === 0 && <p className="p-3 text-sm text-slate-500">Клиент в вашей компании не найден.</p>}
              </div>
            )}
          </div>

          {!token && (
            <div className="panel p-5 text-slate-700">
              <h2 className="text-xl font-semibold text-slate-950">Ожидаем QR клиента</h2>
              <p className="mt-2">Отсканируйте QR-код или введите токен вручную. После этого здесь появится карточка клиента и кнопка действия.</p>
            </div>
          )}

          {token && !membership && !globalCustomerWithoutMembership && !rewardClaim && (
            <div className="panel p-5 text-red-700">
              <h2 className="text-xl font-semibold">Клиент не найден</h2>
              <p className="mt-2 text-sm">Этот QR не найден. Попросите клиента открыть общий кабинет «ПроПлюшка» или отсканировать QR-плакат компании.</p>
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
                Клиент уже зарегистрирован в сервисе «ПроПлюшка», но ещё не участвует в программе вашей компании.
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
                <section className="panel p-5">
                  <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">Проверьте перед нажатием</p>
                    <ul className="mt-2 space-y-1">
                      <li>Клиент совершил покупку сейчас.</li>
                      <li>QR принадлежит этой компании.</li>
                      <li>Повторное начисление одному клиенту временно блокируется.</li>
                    </ul>
                  </div>
                  {membership.rewardAvailable && scannedMembershipUsesGiftBox && openedRewardClaim ? (
                    <div className="rounded-lg bg-amber-100 p-4 text-sm text-amber-950">
                      <p className="text-base font-semibold">🎁 У клиента есть открытый подарок</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{openedRewardClaim.title ?? "Подарок"}</p>
                      {openedRewardClaim.description && <p className="mt-1">{openedRewardClaim.description}</p>}
                      {openedRewardClaim.openedAt && <p className="mt-2 text-slate-700">Открыт: {openedRewardClaim.openedAt.toLocaleString("ru-RU")}</p>}
                      <form action={redeemRewardClaim} className="mt-4">
                        <input type="hidden" name="token" value={openedRewardClaim.token} />
                        <ConfirmSubmit
                          title="Выдать подарок?"
                          confirmText={`Подтвердите выдачу: ${openedRewardClaim.title ?? "Подарок"}. После выдачи прогресс клиента сбросится, а QR станет недействительным.`}
                          buttonText="Выдать подарок"
                        />
                      </form>
                    </div>
                  ) : membership.rewardAvailable && scannedMembershipUsesGiftBox ? (
                    <div className="rounded-lg bg-amber-100 p-4 text-sm font-semibold text-amber-950">
                      Попросите клиента нажать «Открыть подарок» в приложении и показать подарочный QR-код. После сканирования подарочного QR здесь появится конкретный подарок и кнопка выдачи.
                    </div>
                  ) : membership.rewardAvailable ? (
                    <form action={giveReward}>
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <input type="hidden" name="token" value={token} />
                      <ConfirmSubmit
                        title="Выдать подарок?"
                        confirmText={`Подтвердите выдачу: ${membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}. После выдачи прогресс клиента сбросится.`}
                        buttonText="Выдать подарок"
                      />
                    </form>
                  ) : (
                    <form action={confirmPurchase}>
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <input type="hidden" name="token" value={token} />
                      <ConfirmSubmit
                        title="Начислить покупку?"
                        confirmText="Подтвердите, что клиент действительно совершил покупку. Повторное начисление одному клиенту временно блокируется."
                        buttonText="Начислить покупку"
                      />
                    </form>
                  )}
                </section>
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

function rewardClaimStatusText(status: RewardClaimStatus) {
  const labels: Record<RewardClaimStatus, string> = {
    AVAILABLE: "доступен, не открыт",
    OPENED: "открыт клиентом",
    REDEEMED: "выдан",
    EXPIRED: "истёк",
    CANCELLED: "отменён",
  };

  return labels[status];
}
