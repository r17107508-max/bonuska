import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime, operationLabel } from "@/lib/format";

export default async function ClientHistoryPage() {
  const user = await requireUser("/company/login");
  const transactions = await getDb().loyaltyTransaction.findMany({
    where: { membership: { userId: user.id } },
    include: {
      company: true,
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <section className="mx-auto max-w-md space-y-5">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft aria-hidden className="size-4" />
          Назад
        </Link>

        <header className="panel p-5">
          <p className="text-sm font-semibold uppercase text-teal-700">Проплюшки</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">История</h1>
          <p className="mt-2 text-slate-600">Операции по всем вашим бонусным картам.</p>
        </header>

        <section className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{transaction.company.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{operationLabel(transaction.type)} · кассир {transaction.cashier.name}</p>
                </div>
                <p className="text-right text-xs font-medium text-slate-500">{formatDateTime(transaction.createdAt)}</p>
              </div>
              <p className="mt-3 font-mono text-xs text-slate-500">
                {transaction.countBefore} → {transaction.countAfter}
                {transaction.rewardTitle ? ` · ${transaction.rewardTitle}` : ""}
              </p>
            </div>
          ))}
          {transactions.length === 0 && <div className="panel p-5 text-sm text-slate-500">Истории пока нет.</div>}
        </section>
      </section>
    </main>
  );
}
