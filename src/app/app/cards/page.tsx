import Link from "next/link";
import { Gift, Sparkles, WalletCards } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, rewardGoal, type ClientMembership } from "@/lib/customer-app";
import { isGiftBoxProgram } from "@/lib/loyalty";

export default async function ClientCardsPage() {
  const user = await requireUser("/company/login");
  const memberships = await getClientMemberships(user.id);

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800">
              <WalletCards aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#2f1d13]">Мои карты</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#7b6a5b]">Активные программы.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {memberships.map((membership) => (
            <MembershipCard key={membership.id} membership={membership} />
          ))}

          {memberships.length === 0 && (
            <div className="warm-card p-4 text-sm leading-5 text-[#7b6a5b]">
              Карт пока нет. Откройте партнёров и выберите компанию.
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
  const progress = Math.min(100, Math.round((membership.currentCount / goal) * 100));
  const isGiftBox = program ? isGiftBoxProgram(program, membership.company.giftOptions) : false;
  const promoText = program?.rewardDescription || program?.rewardTitle || `${goal} покупок — подарок`;

  return (
    <Link href={`/app/cards/${membership.id}`} className={`warm-card block p-4 transition active:scale-[0.99] ${membership.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#2f1d13]">
            <span className="mr-2">{program?.icon ?? "🎁"}</span>
            {membership.company.name}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[#7b6a5b]">{promoText}</p>
        </div>
        {membership.rewardAvailable && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            <Sparkles aria-hidden className="size-3.5" />
            Доступен
          </span>
        )}
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100">
        <div className={`animated-progress h-full rounded-full ${membership.rewardAvailable ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#4a3528]">
          {membership.rewardAvailable ? "Подарок готов" : `${membership.currentCount}/${goal}`}
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${membership.rewardAvailable ? "text-amber-800" : "text-[#7b6a5b]"}`}>
          <Gift aria-hidden className="size-4" />
          {membership.rewardAvailable && isGiftBox
            ? "Открыть подарок"
            : membership.rewardAvailable
              ? "Подарок доступен"
              : program?.rewardTitle ?? "Подарок"}
        </span>
      </div>
    </Link>
  );
}
