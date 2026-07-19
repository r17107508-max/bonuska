import { CompanyUserRole, LoyaltyProgramType, RewardClaimStatus } from "@prisma/client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Gift, ScanLine, UserRound } from "lucide-react";
import { confirmPurchase, giveReward, joinScannedCustomerAndConfirmPurchase, redeemRewardClaim } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { QrScanner } from "@/components/scanner";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime, phoneLookupValues, statusLabel } from "@/lib/format";
import { DAILY_PURCHASE_LIMIT_PER_CUSTOMER, findCustomerForGlobalScan, findMembershipForScan, findRewardClaimForScan, hasActiveAccess, isGiftBoxProgram, refreshCompanySubscription } from "@/lib/loyalty";
import { formatKopeks, getActiveCompanyRaffle } from "@/lib/raffles";

export default async function CompanyScanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; success?: string; q?: string; source?: string }>;
}) {
  const access = await requireCompanyUser();
  const params = await searchParams;
  const company = await refreshCompanySubscription(access.companyId);
  const token = params.token ?? "";
  const isManualToken = params.source === "manual";
  const rewardClaim = token ? await findRewardClaimForScan(token) : null;
  const membership = token && !rewardClaim ? await findMembershipForScan(access.companyId, token) : null;
  const globalCustomerWithoutMembership = token && !membership && !rewardClaim ? await findCustomerForGlobalScan(access.companyId, token) : null;
  const active = company ? hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil) : false;
  const activeRaffle = active ? await getActiveCompanyRaffle(access.companyId) : null;
  const isCashier = access.role === CompanyUserRole.CASHIER;
  const q = params.q?.trim() ?? "";
  const phoneValues = phoneLookupValues(q);
  const manualMatches = q
    ? await getDb().customerMembership.findMany({
        where: {
          companyId: access.companyId,
          user: {
            OR: [
              { name: { contains: q } },
              { phone: { in: phoneValues } },
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
      isGiftBoxProgram(membership.company.loyaltyProgram, membership.company.giftOptions),
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
  const purchaseQuantityMax = membership && membership.company.loyaltyProgram && !membership.rewardAvailable
    ? await getAvailablePurchaseQuantity({
        companyId: access.companyId,
        membershipId: membership.id,
        currentCount: membership.currentCount,
        goalCount: membership.company.loyaltyProgram.goalCount,
        isCustomerLevels: membership.company.loyaltyProgram.programType === LoyaltyProgramType.CUSTOMER_LEVELS,
      })
    : 0;
  const newCustomerPurchaseQuantityMax = getNewCustomerPurchaseQuantityLimit(access.company.loyaltyProgram);

  return (
    <AdminShell
      title="Сканер QR"
      subtitle="Быстрый рабочий экран: сканируйте QR, проверьте клиента и подтвердите действие."
      nav={companyNavForRole(access.role)}
      cashier={isCashier ? { companyName: access.company.name, status: statusLabel(company?.status ?? access.company.status) } : undefined}
    >
      {!active && <Notice tone="danger" text="Сервис временно недоступен из-за отсутствия оплаты или блокировки. Начисления закрыты." />}
      {params.error && <Notice tone="danger" text={params.error} />}
      {params.success && <Notice tone="success" text={params.success} />}

      {active && rewardClaim && (
        <section className={`panel mb-5 border-2 p-5 ${rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.OPENED ? "border-[var(--border)] bg-[var(--inactive)]" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,200,87,0.44)] text-[#7a4b00]">
              <Gift aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-[#7a4b00]">Подарочный QR распознан</p>
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
                {rewardClaim.openedAt && <p><span className="font-semibold">Открыт:</span> {formatDateTime(rewardClaim.openedAt)}</p>}
                {rewardClaim.redeemedAt && <p><span className="font-semibold">Выдан:</span> {formatDateTime(rewardClaim.redeemedAt)}</p>}
                {rewardClaim.redeemedBy && <p><span className="font-semibold">Кассир:</span> {rewardClaim.redeemedBy.name}</p>}
              </div>
              {rewardClaim.companyId !== access.companyId && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">Этот подарок не относится к вашей компании.</p>
              )}
              {rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.REDEEMED && (
                <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-700">Этот подарок уже был выдан.</p>
              )}
              {rewardClaim.companyId === access.companyId && rewardClaim.status === RewardClaimStatus.AVAILABLE && (
                <p className="mt-4 rounded-lg bg-[rgba(255,200,87,0.25)] p-3 text-sm font-semibold text-[#7a4b00]">Клиент ещё не открыл подарок.</p>
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
        <section className="panel mb-5 border-2 border-[rgba(255,106,61,0.28)] bg-[var(--brand-soft)] p-5">
          <p className="text-sm font-semibold uppercase text-[var(--brand-ink)]">QR распознан</p>
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
                <div className="rounded-lg bg-[rgba(255,200,87,0.25)] p-3 text-sm text-[#5f3a00]">
                  <p className="font-semibold">У клиента есть открытый подарок</p>
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
                <div className="rounded-lg bg-[rgba(255,200,87,0.25)] p-3 text-sm font-semibold text-[#5f3a00]">
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
                  <PurchaseControls
                    maxQuantity={purchaseQuantityMax}
                    activeRaffle={activeRaffle}
                    title="Начислить покупки?"
                    confirmText="Проверьте количество кофе в чеке. После подтверждения выбранное количество покупок будет начислено сразу."
                    buttonText="Начислить покупки"
                  />
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {active && globalCustomerWithoutMembership && (
        <form action={joinScannedCustomerAndConfirmPurchase} className="panel mb-5 border-2 border-[var(--border)] bg-[var(--inactive)] p-5">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm font-semibold uppercase text-[#7a4b00]">Новый клиент для этой компании</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{globalCustomerWithoutMembership.name}</h2>
              <p className="text-sm text-slate-700">Подключить к программе и сразу начислить покупку.</p>
            </div>
            <div className="w-full sm:w-80">
              <PurchaseControls
                maxQuantity={newCustomerPurchaseQuantityMax}
                activeRaffle={activeRaffle}
                title="Подключить клиента?"
                confirmText="Клиент будет подключён к программе вашей компании. После подтверждения выбранное количество покупок будет начислено сразу."
                buttonText="Подключить и начислить"
              />
            </div>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {token ? (
          <section className="warm-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                <ScanLine aria-hidden className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text)]">QR считан</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Камера остановлена, чтобы не запрашивать доступ повторно на экране результата.
                </p>
              </div>
            </div>
            <Link href="/company/scan" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 font-semibold text-white">
              <ScanLine aria-hidden className="size-5" />
              Сканировать другой QR
            </Link>
          </section>
        ) : (
          <QrScanner />
        )}

        <section className="space-y-5">
          <div className="warm-card p-5">
            <h2 className="text-xl font-semibold text-[var(--text)]">Ручной поиск клиента</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Если камера не сработала, найдите клиента по имени или телефону внутри вашей компании.</p>
            <form action="/company/scan" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                name="q"
                defaultValue={q}
                placeholder="Имя или телефон"
                className="min-h-11 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
              <button type="submit" className="min-h-11 rounded-lg bg-[var(--brand)] px-4 font-semibold text-white">Найти</button>
            </form>
            {q && (
              <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {manualMatches.map((item) => (
                  <a key={item.id} href={`/company/scan?token=${encodeURIComponent(`tega:${item.qrToken}`)}`} className="flex items-center justify-between gap-3 p-3">
                    <span>
                      <span className="font-semibold text-slate-950">{item.user.name}</span>
                      <span className="ml-2 text-sm text-slate-500">{item.user.phone}</span>
                    </span>
                    <span className="text-sm font-semibold text-[var(--brand)]">Открыть</span>
                  </a>
                ))}
                {manualMatches.length === 0 && <p className="p-3 text-sm text-slate-500">Клиент в вашей компании не найден.</p>}
              </div>
            )}
          </div>

          {!token && (
            <div className="warm-card p-5 text-[var(--text)]">
              <h2 className="text-xl font-semibold text-[var(--text)]">Ожидаем QR клиента</h2>
              <p className="mt-2">Отсканируйте QR-код или введите токен вручную. После этого здесь появится карточка клиента и кнопка действия.</p>
            </div>
          )}

          {token && !membership && !globalCustomerWithoutMembership && !rewardClaim && (
            <div className="panel p-5 text-red-700">
              <h2 className="text-xl font-semibold">{isManualToken ? "Код введён неверно" : "Клиент не найден"}</h2>
              <p className="mt-2 text-sm">
                {isManualToken
                  ? "Проверьте код под QR клиента или подарка. Если iPhone снова спрашивает камеру, можно открыть сканер в Safari."
                  : "Этот QR не найден. Попросите клиента открыть общий кабинет «ПроПлюшка» или отсканировать QR-плакат компании."}
              </p>
            </div>
          )}

          {globalCustomerWithoutMembership && (
            <div className="panel p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--inactive)] text-[var(--brand)]">
                  <UserRound aria-hidden className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">Новый клиент для вашей компании</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{globalCustomerWithoutMembership.name}</h2>
                  <p className="text-slate-600">{globalCustomerWithoutMembership.phone}</p>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-[var(--inactive)] p-4 text-sm text-[#7a4b00]">
                Клиент уже зарегистрирован в сервисе «ПроПлюшка», но ещё не участвует в программе вашей компании.
              </p>
              {active && (
                <form action={joinScannedCustomerAndConfirmPurchase} className="mt-4">
                  <input type="hidden" name="token" value={token} />
                  <PurchaseControls
                    maxQuantity={newCustomerPurchaseQuantityMax}
                    activeRaffle={activeRaffle}
                    title="Подключить клиента?"
                    confirmText="Клиент будет подключён к программе вашей компании. После подтверждения выбранное количество покупок будет начислено сразу."
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
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
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
                rewardTitle={scannedMembershipUsesGiftBox ? membership.company.loyaltyProgram.rewardTitle : membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle}
                rewardReadyTitle={membership.rewardAvailable && scannedMembershipUsesGiftBox ? "Подарок готов" : undefined}
                rewardReadyHint={
                  membership.rewardAvailable && scannedMembershipUsesGiftBox
                    ? openedRewardClaim
                      ? `Открытый подарок: ${openedRewardClaim.title ?? "Подарок"}. Выдайте его после проверки.`
                      : "Клиент должен открыть коробку в приложении. После этого здесь появится конкретный подарок."
                    : undefined
                }
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
                    <div className="rounded-lg bg-[rgba(255,200,87,0.25)] p-4 text-sm text-[#5f3a00]">
                      <p className="text-base font-semibold">У клиента есть открытый подарок</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{openedRewardClaim.title ?? "Подарок"}</p>
                      {openedRewardClaim.description && <p className="mt-1">{openedRewardClaim.description}</p>}
                      {openedRewardClaim.openedAt && <p className="mt-2 text-slate-700">Открыт: {formatDateTime(openedRewardClaim.openedAt)}</p>}
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
                    <div className="rounded-lg bg-[rgba(255,200,87,0.25)] p-4 text-sm font-semibold text-[#5f3a00]">
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
                      <PurchaseControls
                        maxQuantity={purchaseQuantityMax}
                        activeRaffle={activeRaffle}
                        title="Начислить покупки?"
                        confirmText="Проверьте количество кофе в чеке. После подтверждения выбранное количество покупок будет начислено сразу."
                        buttonText="Начислить покупки"
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

async function getAvailablePurchaseQuantity({
  companyId,
  membershipId,
  currentCount,
  goalCount,
  isCustomerLevels,
}: {
  companyId: string;
  membershipId: string;
  currentCount: number;
  goalCount: number;
  isCustomerLevels: boolean;
}) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const purchasesToday = await getDb().loyaltyTransaction.aggregate({
    where: {
      companyId,
      membershipId,
      type: "PURCHASE",
      createdAt: { gte: dayStart },
    },
    _sum: { quantity: true },
  });
  const dailyRemaining = Math.max(DAILY_PURCHASE_LIMIT_PER_CUSTOMER - (purchasesToday._sum.quantity ?? 0), 0);
  const rewardRemaining = isCustomerLevels ? DAILY_PURCHASE_LIMIT_PER_CUSTOMER : Math.max(goalCount - currentCount, 0);

  return Math.min(DAILY_PURCHASE_LIMIT_PER_CUSTOMER, dailyRemaining, rewardRemaining);
}

function getNewCustomerPurchaseQuantityLimit(program: { programType: LoyaltyProgramType; goalCount: number } | null | undefined) {
  const rewardRemaining = program?.programType === LoyaltyProgramType.CUSTOMER_LEVELS
    ? DAILY_PURCHASE_LIMIT_PER_CUSTOMER
    : Math.max(program?.goalCount ?? DAILY_PURCHASE_LIMIT_PER_CUSTOMER, 0);

  return Math.min(DAILY_PURCHASE_LIMIT_PER_CUSTOMER, rewardRemaining);
}

function PurchaseControls({
  maxQuantity,
  activeRaffle,
  title,
  confirmText,
  buttonText,
}: {
  maxQuantity: number;
  activeRaffle: Awaited<ReturnType<typeof getActiveCompanyRaffle>>;
  title: string;
  confirmText: string;
  buttonText: string;
}) {
  if (maxQuantity <= 0) {
    return (
      <div className="rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">
        Сейчас этому клиенту нельзя начислить ещё покупки: достигнут дневной лимит или уже доступен подарок.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Кофе в чеке</span>
        <input
          type="number"
          name="quantity"
          min={1}
          max={maxQuantity}
          defaultValue={1}
          inputMode="numeric"
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15"
        />
        <span className="mt-1 block text-xs font-medium text-slate-500">Доступно сейчас: до {maxQuantity}</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Сумма покупки</span>
        <input
          name="purchaseAmount"
          inputMode="decimal"
          placeholder="Например, 450"
          required={Boolean(activeRaffle)}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15"
        />
        <span className="mt-1 block text-xs font-medium text-slate-500">
          {activeRaffle
            ? `Для розыгрыша «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}.`
            : "Если активного розыгрыша нет, поле можно оставить пустым."}
        </span>
      </label>
      <ConfirmSubmit title={title} confirmText={confirmText} buttonText={buttonText} />
    </div>
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
