import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ClientCardsPage() {
  const user = await requireUser("/company/login");
  const memberships = await getDb().customerMembership.findMany({
    where: { userId: user.id },
    include: { company: { include: { loyaltyProgram: true } } },
    orderBy: { updatedAt: "desc" },
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
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">Мои бонусные карты</h1>
          <p className="mt-2 text-slate-600">Все компании, где вы участвуете в программе лояльности.</p>
        </header>

        <section className="panel p-4">
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500">
            <Search aria-hidden className="size-4" />
            <span className="text-sm">Поиск по компаниям появится после первых клиентов</span>
          </div>
        </section>

        <section className="space-y-3">
          {memberships.map((membership) => {
            const program = membership.company.loyaltyProgram;
            const goal = program?.goalCount ?? 1;
            const left = Math.max(goal - membership.currentCount, 0);

            return (
              <Link key={membership.id} href={`/app/cards/${membership.id}`} className="panel block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-slate-950">
                      <span className="mr-2">{program?.icon ?? "🎁"}</span>
                      {membership.company.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{membership.company.businessType}</p>
                  </div>
                  <span className="text-sm font-semibold text-teal-700">Открыть</span>
                </div>
                <p className="mt-3 font-semibold text-slate-700">
                  {membership.rewardAvailable
                    ? `Подарок доступен: ${membership.pendingReward ?? program?.rewardTitle ?? "Подарок"}`
                    : `${membership.currentCount} из ${goal}. Осталось ${left}`}
                </p>
              </Link>
            );
          })}
          {memberships.length === 0 && (
            <div className="panel p-5 text-sm text-slate-500">
              Карт пока нет. Отсканируйте QR-плакат компании на кассе.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
