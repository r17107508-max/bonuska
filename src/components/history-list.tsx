import type { LoyaltyTransaction, User } from "@prisma/client";
import { formatDateTime, operationLabel } from "@/lib/format";

type TransactionWithCashier = LoyaltyTransaction & {
  cashier: Pick<User, "id" | "name">;
};

export function HistoryList({
  transactions,
  emptyText = "Операций пока нет",
}: {
  transactions: TransactionWithCashier[];
  emptyText?: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{operationLabel(transaction.type)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {transaction.type === "REWARD_OPENED" ? `Клиент: ${transaction.cashier.name}` : `Кассир: ${transaction.cashier.name}`}
              </p>
            </div>
            <p className="text-right text-xs font-medium text-slate-500">{formatDateTime(transaction.createdAt)}</p>
          </div>
          <p className="mt-3 font-mono text-xs text-slate-500">
            {transaction.countBefore} → {transaction.countAfter}
            {transaction.rewardTitle ? ` · ${transaction.rewardTitle}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
