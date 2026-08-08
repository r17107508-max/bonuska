import { CompanyUserRole, RewardClaimStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { confirmPurchase, deleteClient } from "@/app/actions";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { KpiCard, maskPhone, StatusPill, WorkspaceCard } from "@/components/company-ui";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { DAILY_PURCHASE_LIMIT_PER_CUSTOMER } from "@/lib/loyalty";
import { formatKopeks, getActiveCompanyRaffle } from "@/lib/raffles";

export default async function CompanyClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const access = await requireCompanyUser();
  const [{ id }, pageParams] = await Promise.all([params, searchParams]);
  const membership = await getDb().customerMembership.findFirst({
    where: { id, companyId: access.companyId },
    include: {
      user: true,
      company: { include: { loyaltyProgram: true } },
      transactions: { include: { cashier: true }, orderBy: { createdAt: "desc" } },
      rewardClaims: {
        include: { redeemedBy: { select: { id: true, name: true } } },
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!membership || !membership.company.loyaltyProgram) {
    notFound();
  }

  const program = membership.company.loyaltyProgram;
  const activeRaffle = await getActiveCompanyRaffle(access.companyId);
  const lastPurchase = membership.transactions.find((item) => item.type === "PURCHASE");
  const isAdmin = access.role === CompanyUserRole.COMPANY_ADMIN;
  const canSeePhone = isAdmin;
  const companyNav = companyNavForRole(access.role);
  const displayPhone = canSeePhone ? membership.user.phone : maskPhone(membership.user.phone);

  return (
    <AdminShell title={membership.user.name} subtitle="Полная история операций, прогресс, подарки и служебные данные клиента." nav={companyNav}>
      {pageParams.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{pageParams.error}</p>}
      {pageParams.success && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{pageParams.success}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <WorkspaceCard className="border-[rgba(201,71,38,0.25)] bg-[var(--brand-soft)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-[var(--text)]">{membership.user.name}</h2>
                  {membership.rewardAvailable ? <StatusPill tone="warning">Подарок доступен</StatusPill> : <StatusPill tone="success">Активный клиент</StatusPill>}
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{displayPhone}</p>
                <p className="mt-2 text-sm text-[var(--text)]">Последняя покупка: {formatDateTime(lastPurchase?.createdAt ?? membership.lastActionAt)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm font-semibold text-[var(--text)] sm:w-64">
                <p>Текущий подарок</p>
                <p className="mt-1 text-[var(--text-muted)]">{membership.pendingReward ?? program.rewardTitle}</p>
              </div>
            </div>
          </WorkspaceCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Покупок" value={membership.totalPurchases} />
            <KpiCard label="Подарков" value={membership.totalRewards} />
            <KpiCard label="Прогресс" value={`${membership.currentCount}/${program.goalCount}`} />
          </div>

          <WorkspaceCard className="xl:hidden">
            <form action={confirmPurchase}>
              <input type="hidden" name="membershipId" value={membership.id} />
              <input type="hidden" name="token" value={`tega:${membership.qrToken}`} />
              <input type="hidden" name="returnTo" value={`/company/client/${membership.id}`} />
              <h2 className="text-xl font-extrabold text-[var(--text)]">Начислить покупку</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Если клиент без телефона, начислите покупку по найденной карточке.</p>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Покупок</span>
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={DAILY_PURCHASE_LIMIT_PER_CUSTOMER}
                  defaultValue={1}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Сумма покупки</span>
                <input
                  name="purchaseAmount"
                  inputMode="decimal"
                  placeholder="Например, 450"
                  required={Boolean(activeRaffle)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                {activeRaffle
                  ? `Для розыгрыша «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}.`
                  : "Если активного розыгрыша нет, поле можно оставить пустым."}
              </p>
              <div className="mt-4">
                <ConfirmSubmit
                  title="Начислить покупку?"
                  confirmText="Подтвердите, что клиент совершил покупку сейчас. Повторное начисление одному клиенту временно блокируется сервером."
                  buttonText="Начислить покупку"
                />
              </div>
            </form>
          </WorkspaceCard>

          <ProgressIcons icon={program.icon} current={membership.currentCount} goal={program.goalCount} rewardAvailable={membership.rewardAvailable} rewardTitle={membership.pendingReward ?? program.rewardTitle} />

          <section>
            <h2 className="mb-3 text-xl font-extrabold text-[var(--text)]">История операций</h2>
            <HistoryList transactions={membership.transactions} />
          </section>

          <WorkspaceCard>
            <h2 className="text-xl font-extrabold text-[var(--text)]">Подарки клиента</h2>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {membership.rewardClaims.map((claim) => (
                <div key={claim.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--text)]">{claim.title ?? "Подарок ещё не открыт"}</p>
                      {claim.description && <p className="mt-1 text-[var(--text-muted)]">{claim.description}</p>}
                    </div>
                    <StatusPill tone={claim.status === RewardClaimStatus.REDEEMED ? "success" : claim.status === RewardClaimStatus.OPENED ? "warning" : "neutral"}>
                      {rewardClaimStatusLabel(claim.status)}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-[var(--text-muted)]">
                    Открыт: {formatDateTime(claim.openedAt)}
                    {" · "}
                    Выдан: {formatDateTime(claim.redeemedAt)}
                  </p>
                  {claim.redeemedBy && <p className="mt-1 text-[var(--text-muted)]">Кассир: {claim.redeemedBy.name}</p>}
                </div>
              ))}
              {membership.rewardClaims.length === 0 && <p className="py-3 text-sm text-[var(--text-muted)]">Подарков пока нет.</p>}
            </div>
          </WorkspaceCard>
        </div>

        <aside className="space-y-4">
          <WorkspaceCard>
            <h2 className="text-xl font-extrabold text-[var(--text)]">Данные клиента</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
              <p><span className="font-bold text-[var(--text)]">Телефон:</span> {displayPhone}</p>
              <p><span className="font-bold text-[var(--text)]">Всего покупок:</span> {membership.totalPurchases}</p>
              <p><span className="font-bold text-[var(--text)]">Подарков:</span> {membership.totalRewards}</p>
              {isAdmin && <p className="break-all"><span className="font-bold text-[var(--text)]">QR-токен:</span> tega:{membership.qrToken}</p>}
            </div>
          </WorkspaceCard>

          <WorkspaceCard className="hidden xl:block">
            <form action={confirmPurchase}>
              <input type="hidden" name="membershipId" value={membership.id} />
              <input type="hidden" name="token" value={`tega:${membership.qrToken}`} />
              <input type="hidden" name="returnTo" value={`/company/client/${membership.id}`} />
              <h2 className="text-xl font-extrabold text-[var(--text)]">Начислить покупку</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Для владельца: начисление без перехода в сканер.</p>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Покупок</span>
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={DAILY_PURCHASE_LIMIT_PER_CUSTOMER}
                  defaultValue={1}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Сумма покупки</span>
                <input
                  name="purchaseAmount"
                  inputMode="decimal"
                  placeholder="Например, 450"
                  required={Boolean(activeRaffle)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                {activeRaffle
                  ? `Для розыгрыша «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}.`
                  : "Если активного розыгрыша нет, поле можно оставить пустым."}
              </p>
              <div className="mt-4">
                <ConfirmSubmit
                  title="Начислить покупку?"
                  confirmText="Подтвердите, что клиент совершил покупку сейчас. Повторное начисление одному клиенту временно блокируется сервером."
                  buttonText="Начислить покупку"
                />
              </div>
            </form>
          </WorkspaceCard>

          {isAdmin && (
          <form action={deleteClient}>
            <input type="hidden" name="membershipId" value={membership.id} />
            <ConfirmSubmit
              danger
              title="Удалить клиента?"
              confirmText="Будет удалена привязка клиента к этой компании и его прогресс. Пользователь в других компаниях не затрагивается."
              buttonText="Удалить клиента"
              confirmButtonText="Удалить"
            />
          </form>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function rewardClaimStatusLabel(status: RewardClaimStatus) {
  const labels: Record<RewardClaimStatus, string> = {
    AVAILABLE: "Не открыт",
    OPENED: "Открыт",
    REDEEMED: "Выдан",
    EXPIRED: "Истёк",
    CANCELLED: "Отменён",
  };

  return labels[status];
}
