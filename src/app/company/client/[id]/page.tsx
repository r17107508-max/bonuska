import { notFound } from "next/navigation";
import { confirmPurchase, deleteClient } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HistoryList } from "@/components/history-list";
import { ProgressIcons } from "@/components/progress-cups";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { formatKopeks, getActiveCompanyRaffle } from "@/lib/raffles";

export default async function CompanyClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const access = await requireCompanyAdmin();
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

  return (
    <AdminShell title={membership.user.name} subtitle="Карточка клиента, прогресс, QR-токен и история операций." nav={companyNav}>
      {pageParams.error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{pageParams.error}</p>}
      {pageParams.success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{pageParams.success}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <ProgressIcons icon={program.icon} current={membership.currentCount} goal={program.goalCount} rewardAvailable={membership.rewardAvailable} rewardTitle={membership.pendingReward ?? program.rewardTitle} />
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-950">История операций</h2>
            <HistoryList transactions={membership.transactions} />
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Подарки клиента</h2>
            <div className="mt-4 divide-y divide-slate-200">
              {membership.rewardClaims.map((claim) => (
                <div key={claim.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{claim.title ?? "Подарок еще не открыт"}</p>
                      {claim.description && <p className="mt-1 text-slate-500">{claim.description}</p>}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {rewardClaimStatusLabel(claim.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-600">
                    Открыт: {formatDateTime(claim.openedAt)}
                    {" · "}
                    Выдан: {formatDateTime(claim.redeemedAt)}
                  </p>
                  {claim.redeemedBy && <p className="mt-1 text-slate-600">Кассир: {claim.redeemedBy.name}</p>}
                </div>
              ))}
              {membership.rewardClaims.length === 0 && <p className="py-3 text-sm text-slate-500">Подарков пока нет.</p>}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-950">Данные клиента</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="font-semibold">Телефон:</span> {membership.user.phone}</p>
              <p><span className="font-semibold">Всего покупок:</span> {membership.totalPurchases}</p>
              <p><span className="font-semibold">Подарков:</span> {membership.totalRewards}</p>
              <p className="break-all"><span className="font-semibold">QR-токен:</span> tega:{membership.qrToken}</p>
            </div>
          </section>
          <form action={confirmPurchase} className="panel p-5">
            <input type="hidden" name="membershipId" value={membership.id} />
            <input type="hidden" name="token" value={`tega:${membership.qrToken}`} />
            <input type="hidden" name="returnTo" value={`/company/client/${membership.id}`} />
            <h2 className="text-xl font-semibold text-slate-950">Начислить покупку</h2>
            <p className="mt-1 text-sm text-slate-600">Для владельца: начисление без перехода в сканер.</p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Сумма покупки</span>
              <input
                name="purchaseAmount"
                inputMode="decimal"
                placeholder="Например, 450"
                required={Boolean(activeRaffle)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
            </label>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {activeRaffle
                ? `Для розыгрыша «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}.`
                : "Если активного розыгрыша нет, поле можно оставить пустым."}
            </p>
            <div className="mt-4">
              <ConfirmSubmit
                title="Начислить покупку?"
                confirmText="Подтвердите, что клиент совершил покупку сейчас. Повторное начисление одному клиенту временно блокируется."
                buttonText="Начислить покупку"
              />
            </div>
          </form>
          <form action={deleteClient}>
            <input type="hidden" name="membershipId" value={membership.id} />
            <ConfirmSubmit danger title="Удалить клиента?" confirmText="Будет удалена привязка клиента к этой компании и его прогресс. Пользователь в других компаниях не затрагивается." buttonText="Удалить клиента" />
          </form>
        </aside>
      </div>
    </AdminShell>
  );
}

function rewardClaimStatusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Не открыт",
    OPENED: "Открыт",
    REDEEMED: "Выдан",
    EXPIRED: "Истек",
    CANCELLED: "Отменен",
  };

  return labels[status] ?? status;
}
