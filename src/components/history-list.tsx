import type { LoyaltyTransaction, User } from "@prisma/client";
import { formatDateTime, operationLabel } from "@/lib/format";

type TransactionWithCashier = LoyaltyTransaction & {
  cashier: Pick<User, "id" | "name">;
};

export function HistoryList({
  transactions,
  emptyText = "Операций пока нет.",
}: {
  transactions: TransactionWithCashier[];
  emptyText?: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-5 text-sm text-[var(--text-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const quantity = transaction.type === "PURCHASE" ? transaction.quantity : 0;

        return (
          <div key={transaction.id} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--text)]">{operationLabel(transaction.type)}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {transaction.type === "REWARD_OPENED" ? `Открыл: ${transaction.cashier.name}` : `Кассир: ${transaction.cashier.name}`}
                </p>
              </div>
              <p className="text-right text-xs font-semibold text-[var(--text-muted)]">{formatDateTime(transaction.createdAt)}</p>
            </div>
            <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">
              {transaction.countBefore} {"->"} {transaction.countAfter}
              {quantity > 1 ? ` · +${quantity}` : ""}
              {transaction.rewardTitle ? ` · ${transaction.rewardTitle}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
