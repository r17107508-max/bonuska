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
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <WalletCards aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text)]">Мои карты</h1>
              <p className="mt-0.5 text-sm leading-5 text-[var(--text-muted)]">Активные программы.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {memberships.map((membership) => (
            <MembershipCard key={membership.id} membership={membership} />
          ))}

          {memberships.length === 0 && (
            <div className="warm-card p-4 text-sm leading-5 text-[var(--text-muted)]">
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
    <Link href={`/app/cards/${membership.id}`} className={`warm-card block p-4 transition active:scale-[0.99] ${membership.rewardAvailable ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[var(--text)]">
            <span className="mr-2 inline-flex size-8 align-middle items-center justify-center rounded-[12px] bg-[var(--brand-soft)] text-[var(--brand)]">
              <Gift aria-hidden className="size-4" />
            </span>
            {membership.company.name}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--text-muted)]">{promoText}</p>
        </div>
        {membership.rewardAvailable && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(255,200,87,0.25)] px-3 py-1 text-xs font-bold text-[#7a4b00]">
            <Sparkles aria-hidden className="size-3.5" />
            Доступен
          </span>
        )}
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(255,200,87,0.25)]">
        <div className={`animated-progress h-full rounded-full ${membership.rewardAvailable ? "bg-[var(--gold)]" : "bg-[var(--brand)]"}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[var(--text)]">
          {membership.rewardAvailable ? "Подарок готов" : `${membership.currentCount}/${goal}`}
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${membership.rewardAvailable ? "text-[#7a4b00]" : "text-[var(--text-muted)]"}`}>
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
