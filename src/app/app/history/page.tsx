import Link from "next/link";
import { Clock3, Gift, ShoppingBag, Sparkles, Trophy } from "lucide-react";
import { CompanyStatus, LoyaltyTransactionType, Prisma } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";

type HistoryFilter = "all" | "purchase" | "rewards" | "levels";

const filterTabs: { key: HistoryFilter; label: string; types?: LoyaltyTransactionType[] }[] = [
  { key: "all", label: "Все" },
  { key: "purchase", label: "Начисления", types: [LoyaltyTransactionType.PURCHASE] },
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
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800">
              <Clock3 aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-green-800">Прозрачность</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2f1d13]">История</h1>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">Покупки, подарки и уровни по всем картам.</p>
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/app/history" : `/app/history?filter=${tab.key}`}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-lg px-4 text-sm font-bold ${
                filter === tab.key ? "bg-green-700 text-white" : "border border-amber-100 bg-white/80 text-[#5c3521]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          {transactions.map((transaction) => {
            const goal = transaction.company.loyaltyProgram?.goalCount ?? Math.max(transaction.countAfter, 1);
            const meta = operationMeta(transaction.type);

            return (
              <div key={transaction.id} className="warm-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
                    <meta.icon aria-hidden className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#2f1d13]">{transaction.company.name}</p>
                        <p className="mt-1 text-sm font-semibold text-[#5c3521]">{meta.label}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#7b6a5b]">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-[#7b6a5b]">
                      {transaction.type === "LEVEL_UP"
                        ? `Покупок всего: ${transaction.countAfter}`
                        : `Прогресс: ${transaction.countAfter} из ${goal}`}
                    </p>
                    {transaction.rewardTitle && (
                      <p className="mt-1 text-sm font-semibold text-amber-800">
                        {transaction.type === "LEVEL_UP" ? `Уровень: ${transaction.rewardTitle}` : `Подарок: ${transaction.rewardTitle}`}
                      </p>
                    )}
                    {transaction.type === "REWARD_OPENED" && (
                      <p className="mt-1 text-sm font-semibold text-amber-900">Покажите QR подарка кассиру.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="warm-card p-5 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                <Clock3 aria-hidden className="size-6" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-[#2f1d13]">Операций пока нет</h2>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
                Когда кассир начислит покупку или выдаст подарок, запись появится здесь.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function operationMeta(type: LoyaltyTransactionType) {
  const labels: Record<LoyaltyTransactionType, { label: string; icon: typeof ShoppingBag; iconBg: string }> = {
    PURCHASE: { label: "Начислена покупка", icon: ShoppingBag, iconBg: "bg-green-50 text-green-800" },
    LEVEL_UP: { label: "Достигнут новый уровень", icon: Trophy, iconBg: "bg-blue-50 text-blue-800" },
    REWARD_OPENED: { label: "Открыт подарок", icon: Sparkles, iconBg: "bg-amber-100 text-amber-900" },
    REWARD_REDEEMED: { label: "Выдан подарок", icon: Gift, iconBg: "bg-amber-100 text-amber-900" },
    REWARD_GRANTED: { label: "Выдан подарок", icon: Gift, iconBg: "bg-amber-100 text-amber-900" },
    MANUAL_ADJUSTMENT: { label: "Ручное изменение", icon: Clock3, iconBg: "bg-slate-100 text-slate-700" },
  };

  return labels[type];
}
