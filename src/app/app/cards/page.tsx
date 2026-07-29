import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientEmptyState, ClientShell, ProgramSummaryCard } from "@/components/client-ui";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, rewardGoal, rewardLeft } from "@/lib/customer-app";

export default async function ClientCardsPage() {
  const user = await requireUser("/company/login");
  const memberships = await getClientMemberships(user.id);

  return (
    <ClientShell>
      <ClientBrandHeader greeting="Мои карты" />

      <section>
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">Активные программы</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Все партнёры, у которых вы уже начали копить покупки.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {memberships.map((membership) => (
          <ProgramSummaryCard
            key={membership.id}
            href={`/app/cards/${membership.id}`}
            companyName={membership.company.name}
            businessType={membership.company.businessType}
            logoUrl={membership.company.logoUrl}
            icon={membership.company.loyaltyProgram?.icon ?? membership.company.icon}
            rewardTitle={membership.company.loyaltyProgram?.rewardTitle ?? "Подарок"}
            current={membership.currentCount}
            goal={rewardGoal(membership)}
            left={rewardLeft(membership)}
            address={membership.company.address}
            rewardAvailable={membership.rewardAvailable}
            themeColor={membership.company.loyaltyProgram?.themeColor ?? membership.company.themeColor}
          />
        ))}

        {memberships.length === 0 && (
          <ClientEmptyState
            image="client-first-card"
            alt="Иллюстрация первой карты лояльности"
            title="Начните собирать первую плюшку"
            text="Выберите партнёра и покажите QR при покупке."
            actionHref="/app/partners"
            actionLabel="Найти партнёра"
          />
        )}
      </section>
    </ClientShell>
  );
}
