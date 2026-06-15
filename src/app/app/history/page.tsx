import { Clock3 } from "lucide-react";
import { CompanyStatus, LoyaltyTransactionType } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function ClientHistoryPage() {
  const user = await requireUser("/company/login");
  const transactions = await getDb().loyaltyTransaction.findMany({
    where: { membership: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } } },
    include: {
      company: { include: { loyaltyProgram: true } },
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        <section className="panel p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Clock3 aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">История</h1>
              <p className="mt-1 text-sm leading-5 text-slate-600">Операции по всем компаниям.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {transactions.map((transaction) => {
            const goal = transaction.company.loyaltyProgram?.goalCount ?? Math.max(transaction.countAfter, 1);

            return (
              <div key={transaction.id} className="panel p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{formatDate(transaction.createdAt)}</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {transaction.company.name} — {clientOperationLabel(transaction.type)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">Прогресс: {transaction.countAfter} из {goal}</p>
                {transaction.rewardTitle && <p className="mt-1 text-sm text-amber-800">Подарок: {transaction.rewardTitle}</p>}
                {transaction.type === "REWARD_OPENED" && (
                  <p className="mt-1 text-sm font-semibold text-amber-900">Покажите QR подарка кассиру.</p>
                )}
              </div>
            );
          })}

          {transactions.length === 0 && <div className="panel p-5 text-sm text-slate-600">Истории пока нет.</div>}
        </section>
      </section>
    </main>
  );
}

function clientOperationLabel(type: LoyaltyTransactionType) {
  const labels: Record<LoyaltyTransactionType, string> = {
    PURCHASE: "начислена покупка",
    REWARD_OPENED: "вы открыли подарок",
    REWARD_REDEEMED: "выдан подарок",
    REWARD_GRANTED: "выдан подарок",
    MANUAL_ADJUSTMENT: "ручное изменение",
  };

  return labels[type];
}
