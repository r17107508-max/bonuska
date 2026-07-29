import Link from "next/link";
import { Clock3, Gift, ShoppingBag, Sparkles, Trophy } from "lucide-react";
import { CompanyStatus, LoyaltyTransactionType, Prisma } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientEmptyState, ClientShell, QuickQrButton } from "@/components/client-ui";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

type HistoryFilter = "all" | "purchase" | "rewards" | "levels";

const filterTabs: { key: HistoryFilter; label: string; types?: LoyaltyTransactionType[] }[] = [
  { key: "all", label: "Все" },
  { key: "purchase", label: "Покупки", types: [LoyaltyTransactionType.PURCHASE] },
  { key: "rewards", label: "Подарки", types: [LoyaltyTransactionType.REWARD_OPENED, LoyaltyTransactionType.REWARD_REDEEMED, LoyaltyTransactionType.REWARD_GRANTED] },
  { key: "levels", label: "Уровни", types: [LoyaltyTransactionType.LEVEL_UP] },
];

export default async function ClientHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const filter = filterTabs.some((tab) => tab.key === params.filter) ? params.filter as HistoryFilter : "all";
  const selectedTab = filterTabs.find((tab) => tab.key === filter)!;
  const where: Prisma.LoyaltyTransactionWhereInput = {
    membership: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    ...(selectedTab.types ? { type: { in: selectedTab.types } } : {}),
  };
  const transactions = await getDb().loyaltyTransaction.findMany({
    where,
    include: {
      company: { include: { loyaltyProgram: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const groups = groupTransactions(transactions);

  return (
    <ClientShell>
      <ClientBrandHeader greeting="История" />

      <section>
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">История операций</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Покупки, подарки и уровни по всем программам.</p>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр истории">
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/app/history" : `/app/history?filter=${tab.key}`}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-2xl px-4 text-sm font-extrabold ${
              filter === tab.key ? "bg-[var(--brand-strong)] text-white" : "border border-[var(--border)] bg-white text-[var(--text)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </section>

      {transactions.length === 0 ? (
        <ClientEmptyState
          image="client-empty-history"
          alt="Иллюстрация пустой истории операций"
          title="Здесь появятся ваши покупки и подарки"
          actionHref="/app/qr"
          actionLabel="Показать QR"
        />
      ) : (
        <section className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 px-1 text-sm font-extrabold uppercase text-[var(--text-muted)]">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((transaction) => {
                  const goal = transaction.company.loyaltyProgram?.goalCount ?? Math.max(transaction.countAfter, 1);
                  const meta = operationMeta(transaction.type, transaction.quantity);

                  return (
                    <article key={transaction.id} className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}>
                          <meta.icon aria-hidden className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-extrabold text-[var(--text)]">{transaction.company.name}</p>
                              <p className="mt-1 text-sm font-bold text-[var(--text)]">{meta.label}</p>
                            </div>
                            <time className="shrink-0 text-xs font-bold text-[var(--text-muted)]" dateTime={transaction.createdAt.toISOString()}>
                              {formatDateTime(transaction.createdAt)}
                            </time>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">
                            {transaction.type === "LEVEL_UP"
                              ? `Покупок всего: ${transaction.countAfter}`
                              : `Прогресс: ${transaction.countAfter} из ${goal}`}
                          </p>
                          {transaction.rewardTitle && (
                            <p className="mt-1 text-sm font-bold text-[#7a4b00]">
                              {transaction.type === "LEVEL_UP" ? `Уровень: ${transaction.rewardTitle}` : `Подарок: ${transaction.rewardTitle}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-1">
            <QuickQrButton />
          </div>
        </section>
      )}
    </ClientShell>
  );
}

function groupTransactions<T extends { createdAt: Date }>(transactions: T[]) {
  const now = new Date();
  const todayKey = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);
  const groups = new Map<string, T[]>();

  transactions.forEach((transaction) => {
    const key = dayKey(transaction.createdAt);
    const label = key === todayKey ? "Сегодня" : key === yesterdayKey ? "Вчера" : "Ранее";
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function operationMeta(type: LoyaltyTransactionType, quantity = 1) {
  const labels: Record<LoyaltyTransactionType, { label: string; icon: typeof ShoppingBag; iconBg: string }> = {
    PURCHASE: {
      label: quantity > 1 ? `Начислено покупок: ${quantity}` : "Покупка начислена",
      icon: ShoppingBag,
      iconBg: "bg-[var(--brand-soft)] text-[var(--brand-strong)]",
    },
    LEVEL_UP: { label: "Достигнут новый уровень", icon: Trophy, iconBg: "bg-blue-50 text-blue-800" },
    REWARD_OPENED: { label: "Подарок открыт", icon: Sparkles, iconBg: "bg-[rgba(255,180,76,0.28)] text-[#7a4b00]" },
    REWARD_REDEEMED: { label: "Подарок выдан", icon: Gift, iconBg: "bg-[rgba(255,180,76,0.28)] text-[#7a4b00]" },
    REWARD_GRANTED: { label: "Подарок выдан", icon: Gift, iconBg: "bg-[rgba(255,180,76,0.28)] text-[#7a4b00]" },
    MANUAL_ADJUSTMENT: { label: "Ручное изменение", icon: Clock3, iconBg: "bg-slate-100 text-slate-700" },
  };

  return labels[type];
}
