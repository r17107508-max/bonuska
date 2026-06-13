import Link from "next/link";
import { Gift, WalletCards } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, rewardGoal, rewardLeft, type ClientMembership } from "@/lib/customer-app";

export default async function ClientCardsPage() {
  const user = await requireUser("/company/login");
  const memberships = await getClientMemberships(user.id);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        <section className="panel p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <WalletCards aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Мои карты</h1>
              <p className="mt-1 text-sm leading-5 text-slate-600">Компании, где вы уже копите плюшки.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {memberships.map((membership) => (
            <MembershipCard key={membership.id} membership={membership} />
          ))}

          {memberships.length === 0 && (
            <div className="panel p-5 text-sm leading-6 text-slate-600">
              Карт пока нет. Откройте «Партнёры», выберите компанию и начните копить плюшки.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function MembershipCard({ membership }: { membership: ClientMembership }) {
  const program = membership.company.loyaltyProgram;
  const goal = rewardGoal(membership);
  const left = rewardLeft(membership);
  const progress = Math.min(100, Math.round((membership.currentCount / goal) * 100));

  return (
    <Link href={`/app/cards/${membership.id}`} className="panel block p-4 transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-slate-950">
            <span className="mr-2">{program?.icon ?? "🎁"}</span>
            {membership.company.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{membership.company.businessType}</p>
        </div>
        {membership.rewardAvailable && (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Доступен
          </span>
        )}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${membership.rewardAvailable ? "bg-amber-500" : "bg-teal-700"}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">
          {membership.currentCount} из {goal}. Осталось {left}
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${membership.rewardAvailable ? "text-amber-800" : "text-slate-500"}`}>
          <Gift aria-hidden className="size-4" />
          {membership.rewardAvailable ? "Подарок доступен" : program?.rewardTitle ?? "Подарок"}
        </span>
      </div>
    </Link>
  );
}
