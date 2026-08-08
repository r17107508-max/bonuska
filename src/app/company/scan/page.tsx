import { CompanyUserRole, RewardClaimStatus } from "@prisma/client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Gift, ScanLine, UserRound } from "lucide-react";
import { confirmPurchase, giveReward, joinScannedCustomerAndConfirmPurchase, redeemRewardClaim } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CompanyScanSearch } from "@/components/company-scan-search";
import { QrScanner } from "@/components/scanner";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { StatusPill, WorkspaceCard, maskPhone } from "@/components/company-ui";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime, statusLabel } from "@/lib/format";
import { DAILY_PURCHASE_LIMIT_PER_CUSTOMER, findCustomerForGlobalScan, findMembershipForScan, findRewardClaimForScan, hasActiveAccess, isGiftBoxProgram, refreshCompanySubscription } from "@/lib/loyalty";
import { formatKopeks, getActiveCompanyRaffle } from "@/lib/raffles";

type ScannedMembership = NonNullable<Awaited<ReturnType<typeof findMembershipForScan>>>;
type ActiveCompanyRaffle = Awaited<ReturnType<typeof getActiveCompanyRaffle>>;
type OpenedRewardClaim = {
  token: string;
  title: string | null;
  description: string | null;
  openedAt: Date | null;
} | null;

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
      })
    : 0;
  const newCustomerPurchaseQuantityMax = DAILY_PURCHASE_LIMIT_PER_CUSTOMER;

  return (
    <AdminShell
      title="Сканер QR"
      subtitle="Камера, результат сканирования и подтверждение операции на одном рабочем экране."
      nav={companyNavForRole(access.role)}
      cashier={isCashier ? { companyName: access.company.name, status: statusLabel(company?.status ?? access.company.status) } : undefined}
    >
      {!active && <Notice tone="danger" text="Сервис временно недоступен из-за статуса подписки. Начисления закрыты." />}
      {params.error && <Notice tone="danger" text={params.error} />}
      {params.success && <Notice tone="success" text={params.success} />}

      <div className={`grid gap-6 ${token ? "" : "xl:grid-cols-[minmax(320px,460px)_1fr]"}`}>
        <section className={`space-y-5 ${token ? "" : "order-2"}`}>
          {!token && (
            <WorkspaceCard>
              <h2 className="text-xl font-extrabold text-[var(--text)]">Ожидаем QR клиента</h2>
              <p className="mt-2 text-[var(--text-muted)]">После сканирования здесь появится карточка клиента, прогресс, доступный подарок и последние операции.</p>
            </WorkspaceCard>
          )}

          {token && !membership && !globalCustomerWithoutMembership && !rewardClaim && (
            <WorkspaceCard className="border-red-100 bg-red-50">
              <h2 className="text-xl font-extrabold text-[var(--danger)]">{isManualToken ? "QR недействителен" : "Клиент не найден"}</h2>
              <p className="mt-2 text-sm text-[var(--danger)]">
                {isManualToken
                  ? "Проверьте ручной код под QR клиента или подарка."
                  : "Этот QR не найден в вашей компании. Попросите клиента открыть свой кабинет или отсканировать QR-плакат компании."}
              </p>
            </WorkspaceCard>
          )}

          {active && rewardClaim && (
            <RewardClaimCard rewardClaim={rewardClaim} token={token} />
          )}

          {active && globalCustomerWithoutMembership && (
            <WorkspaceCard className="border-amber-200 bg-amber-50">
              <form action={joinScannedCustomerAndConfirmPurchase}>
                <input type="hidden" name="token" value={token} />
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-strong)]">
                    <UserRound aria-hidden className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase text-amber-900">Новый клиент для этой компании</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-[var(--text)]">{globalCustomerWithoutMembership.name}</h2>
                    <p className="text-sm text-amber-900">{isCashier ? maskPhone(globalCustomerWithoutMembership.phone) : globalCustomerWithoutMembership.phone}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-amber-900">Клиент уже зарегистрирован в «ПроПлюшка», но ещё не участвует в вашей программе.</p>
                <div className="mt-4">
                  <PurchaseControls
                    maxQuantity={newCustomerPurchaseQuantityMax}
                    activeRaffle={activeRaffle}
                    title="Подключить клиента?"
                    confirmText="Клиент будет подключён к программе вашей компании. После подтверждения выбранное количество покупок будет начислено сразу."
                    buttonText="Подключить и начислить"
                  />
                </div>
              </form>
            </WorkspaceCard>
          )}

          {membership && membership.company.loyaltyProgram && (
            <>
              <WorkspaceCard className="border-[rgba(201,71,38,0.25)] bg-[var(--brand-soft)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-strong)]">
                      <UserRound aria-hidden className="size-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-extrabold text-[var(--text)]">{membership.user.name}</h2>
                        {membership.rewardAvailable && <StatusPill tone="warning">Подарок доступен</StatusPill>}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{isCashier ? maskPhone(membership.user.phone) : membership.user.phone}</p>
                      <p className="mt-2 text-sm text-[var(--text)]">
                        Прогресс: {membership.currentCount} из {membership.company.loyaltyProgram.goalCount}
                        {" · "}
                        Последняя покупка: {formatDateTime(membership.lastActionAt)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-sm font-semibold text-[var(--text)] lg:w-64">
                    <p>Доступный подарок</p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {membership.rewardAvailable ? membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle : "Пока недоступен"}
                    </p>
                  </div>
                </div>
              </WorkspaceCard>

              {active && (
                <MembershipActionCard
                  membership={membership}
                  token={token}
                  activeRaffle={activeRaffle}
                  purchaseQuantityMax={purchaseQuantityMax}
                  scannedMembershipUsesGiftBox={scannedMembershipUsesGiftBox}
                  openedRewardClaim={openedRewardClaim}
                />
              )}

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
                      : "Клиент должен открыть коробку в приложении и показать подарочный QR."
                    : undefined
                }
              />

              <section>
                <h2 className="mb-3 text-xl font-extrabold text-[var(--text)]">Последние операции</h2>
                <HistoryList transactions={membership.transactions} />
              </section>
            </>
          )}
        </section>

        <section className={`space-y-4 ${token ? "order-2" : ""}`}>
          {token ? (
            <WorkspaceCard>
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <ScanLine aria-hidden className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text)]">QR распознан</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Камера остановлена, чтобы не выполнить повторное сканирование.</p>
                </div>
              </div>
              <Link href="/company/scan" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 font-bold text-white">
                <ScanLine aria-hidden className="size-5" />
                Сканировать другой QR
              </Link>
            </WorkspaceCard>
          ) : (
            <QrScanner />
          )}

          <section className="panel p-4">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-[var(--text)]">Поиск клиента</h2>
              <p className="text-sm text-[var(--text-muted)]">Если QR не сканируется, найдите клиента по имени или телефону.</p>
            </div>
            <div className="mt-4 space-y-4">
              <CompanyScanSearch initialQuery={q} />

              <form action="/company/scan" method="get" className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="source" value="manual" />
                <label>
                  <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Ручной код под QR</span>
                  <input
                    name="token"
                    placeholder="Введите код"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
                  />
                </label>
                <button type="submit" className="min-h-11 self-end rounded-xl border border-[var(--border)] bg-white px-4 font-bold text-[var(--text)]">Открыть</button>
              </form>

            </div>
          </section>
        </section>

      </div>
    </AdminShell>
  );
}

function RewardClaimCard({
  rewardClaim,
  token,
}: {
  rewardClaim: Awaited<ReturnType<typeof findRewardClaimForScan>>;
  token: string;
}) {
  if (!rewardClaim) return null;
  const isOpen = rewardClaim.status === RewardClaimStatus.OPENED;

  return (
    <WorkspaceCard className={isOpen ? "border-amber-200 bg-amber-50" : undefined}>
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800">
          <Gift aria-hidden className="size-6" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase text-amber-900">Подарочный QR распознан</p>
          <h2 className="mt-1 text-2xl font-extrabold text-[var(--text)]">{rewardClaim.user.name}</h2>
          <p className="mt-1 text-sm text-amber-900">{rewardClaim.title ?? "Подарок пока не открыт"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-amber-950 sm:grid-cols-2">
        <p><span className="font-bold">Компания:</span> {rewardClaim.company.name}</p>
        <p><span className="font-bold">Статус:</span> {rewardClaimStatusText(rewardClaim.status)}</p>
        <p><span className="font-bold">Открыт:</span> {formatDateTime(rewardClaim.openedAt)}</p>
        <p><span className="font-bold">Выдан:</span> {formatDateTime(rewardClaim.redeemedAt)}</p>
      </div>
      {isOpen && (
        <form action={redeemRewardClaim} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <ConfirmSubmit
            title="Выдать подарок?"
            confirmText={`Подтвердите выдачу: ${rewardClaim.title ?? "Подарок"}. После выдачи подарочный QR станет недействительным.`}
            buttonText="Выдать подарок"
          />
        </form>
      )}
    </WorkspaceCard>
  );
}

function MembershipActionCard({
  membership,
  token,
  activeRaffle,
  purchaseQuantityMax,
  scannedMembershipUsesGiftBox,
  openedRewardClaim,
}: {
  membership: ScannedMembership;
  token: string;
  activeRaffle: ActiveCompanyRaffle;
  purchaseQuantityMax: number;
  scannedMembershipUsesGiftBox: boolean;
  openedRewardClaim: OpenedRewardClaim;
}) {
  const program = membership.company.loyaltyProgram;
  if (!program) return null;

  return (
    <WorkspaceCard>
      <h2 className="text-xl font-extrabold text-[var(--text)]">Действие с клиентом</h2>
      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-muted)]">
        <p className="font-bold text-[var(--text)]">Проверьте итог перед подтверждением</p>
        <p className="mt-1">Операция будет записана на сервере. Защита от повторного начисления остаётся серверной.</p>
      </div>
      <div className="mt-4">
        {membership.rewardAvailable && scannedMembershipUsesGiftBox && openedRewardClaim ? (
          <OpenedGiftClaim openedRewardClaim={openedRewardClaim} />
        ) : membership.rewardAvailable ? (
          <form action={giveReward}>
            <input type="hidden" name="membershipId" value={membership.id} />
            <input type="hidden" name="token" value={token} />
            {scannedMembershipUsesGiftBox && (
              <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Если клиент без телефона, подарок можно выдать по найденной карте. Если коробка ещё не открыта, система выберет доступный подарок и сразу отметит выдачу.
              </p>
            )}
            <ConfirmSubmit
              title={scannedMembershipUsesGiftBox ? "Выдать подарок без QR?" : "Выдать подарок?"}
              confirmText={
                scannedMembershipUsesGiftBox
                  ? `Подтвердите выдачу подарка клиенту ${membership.user.name}. Операция будет записана без сканирования подарочного QR.`
                  : `Подтвердите выдачу: ${membership.pendingReward ?? program.rewardTitle}. После выдачи прогресс клиента сбросится.`
              }
              buttonText={scannedMembershipUsesGiftBox ? "Выдать подарок без QR" : "Выдать подарок"}
            />
          </form>
        ) : (
          <form action={confirmPurchase}>
            <input type="hidden" name="membershipId" value={membership.id} />
            <input type="hidden" name="token" value={token} />
            <PurchaseControls
              maxQuantity={purchaseQuantityMax}
              activeRaffle={activeRaffle}
              title="Начислить покупку?"
              confirmText="Проверьте количество покупок в чеке. После подтверждения операция будет начислена сразу."
              buttonText="Начислить покупку"
            />
          </form>
        )}
      </div>
    </WorkspaceCard>
  );
}

function OpenedGiftClaim({
  openedRewardClaim,
}: {
  openedRewardClaim: {
    token: string;
    title: string | null;
    description: string | null;
    openedAt: Date | null;
  };
}) {
  return (
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
      <p className="text-base font-bold">У клиента есть открытый подарок</p>
      <p className="mt-2 text-lg font-extrabold text-[var(--text)]">{openedRewardClaim.title ?? "Подарок"}</p>
      {openedRewardClaim.description && <p className="mt-1">{openedRewardClaim.description}</p>}
      {openedRewardClaim.openedAt && <p className="mt-2">Открыт: {formatDateTime(openedRewardClaim.openedAt)}</p>}
      <form action={redeemRewardClaim} className="mt-4">
        <input type="hidden" name="token" value={openedRewardClaim.token} />
        <ConfirmSubmit
          title="Выдать подарок?"
          confirmText={`Подтвердите выдачу: ${openedRewardClaim.title ?? "Подарок"}. После выдачи прогресс клиента сбросится.`}
          buttonText="Выдать подарок"
        />
      </form>
    </div>
  );
}

async function getAvailablePurchaseQuantity({
  companyId,
  membershipId,
}: {
  companyId: string;
  membershipId: string;
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

  return Math.min(DAILY_PURCHASE_LIMIT_PER_CUSTOMER, dailyRemaining);
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
      <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Сейчас этому клиенту нельзя начислить ещё покупки: достигнут дневной лимит или уже доступен подарок.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[var(--text)]">Покупок в чеке</span>
        <input
          type="number"
          name="quantity"
          min={1}
          max={maxQuantity}
          defaultValue={1}
          inputMode="numeric"
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-semibold text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
        />
        <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">Доступно сейчас: до {maxQuantity}</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[var(--text)]">Сумма покупки</span>
        <input
          name="purchaseAmount"
          inputMode="decimal"
          placeholder="Например, 450"
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-semibold text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
        />
        <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">
          {activeRaffle
            ? `Для участия в розыгрыше «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}. Без суммы покупка всё равно начислится, но билет не создастся.`
            : "Поле можно оставить пустым: покупка начислится без суммы чека."}
        </span>
      </label>
      <ConfirmSubmit title={title} confirmText={confirmText} buttonText={buttonText} />
    </div>
  );
}

function Notice({ tone, text }: { tone: "success" | "danger"; text: string }) {
  const success = tone === "success";

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl p-4 font-semibold ${success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-[var(--danger)]"}`}>
      {success ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />}
      <p>{text}</p>
    </div>
  );
}

function rewardClaimStatusText(status: RewardClaimStatus) {
  const labels: Record<RewardClaimStatus, string> = {
    AVAILABLE: "Доступен, не открыт",
    OPENED: "Открыт клиентом",
    REDEEMED: "Выдан",
    EXPIRED: "Истёк",
    CANCELLED: "Отменён",
  };

  return labels[status];
}
