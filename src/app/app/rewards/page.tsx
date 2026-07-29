import Link from "next/link";
import { LockKeyhole, Sparkles, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientEmptyState, ClientShell, ProgressBar, pluralPurchasesLeft } from "@/components/client-ui";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, rewardGoal, rewardLeft, type ClientMembership } from "@/lib/customer-app";
import { isGiftBoxProgram } from "@/lib/loyalty";

type RewardTab = "ready" | "soon" | "all";

export default async function ClientRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; company?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const memberships = await getClientMemberships(user.id);
  const tab: RewardTab = params.tab === "soon" || params.tab === "all" ? params.tab : "ready";
  const companyId = params.company ?? "all";
  const rewards = memberships.flatMap(buildRewardItems).sort((a, b) => a.left - b.left);
  const companies = memberships.map((membership) => ({ id: membership.company.id, name: membership.company.name }));
  const filteredRewards = rewards.filter((reward) => {
    const tabMatch = tab === "all" || reward.status === tab;
    const companyMatch = companyId === "all" || reward.companyId === companyId;
    return tabMatch && companyMatch;
  });

  return (
    <ClientShell>
      <ClientBrandHeader greeting="Награды" />

      <section>
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">Ваши подарки</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Готовые награды и те, до которых осталось совсем немного.</p>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр наград">
        <TabLink active={tab === "ready"} href="/app/rewards?tab=ready">Готовы</TabLink>
        <TabLink active={tab === "soon"} href="/app/rewards?tab=soon">Скоро</TabLink>
        <TabLink active={tab === "all"} href="/app/rewards?tab=all">Все</TabLink>
      </section>

      {companies.length > 1 && (
        <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр партнёров">
          <CompanyFilter active={companyId === "all"} href={`/app/rewards?tab=${tab}`}>Все</CompanyFilter>
          {companies.map((company) => (
            <CompanyFilter key={company.id} active={companyId === company.id} href={`/app/rewards?tab=${tab}&company=${company.id}`}>
              {company.name}
            </CompanyFilter>
          ))}
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {filteredRewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}

        {filteredRewards.length === 0 && (
          <ClientEmptyState
            image="client-empty-rewards"
            alt="Иллюстрация пустого списка наград"
            title="Подарки уже близко"
            text="Совершайте покупки у партнёров и следите за прогрессом."
            actionHref="/app/partners"
            actionLabel="Посмотреть партнёров"
          />
        )}
      </section>
    </ClientShell>
  );
}

function buildRewardItems(membership: ClientMembership) {
  const program = membership.company.loyaltyProgram;
  if (!program) return [];

  const goal = rewardGoal(membership);
  const left = rewardLeft(membership);
  const status: RewardTab = membership.rewardAvailable ? "ready" : left <= 2 ? "soon" : "all";
  const activeGiftOptions = membership.company.giftOptions.filter((giftOption) => giftOption.isActive);
  const isGiftBox = isGiftBoxProgram(program, activeGiftOptions);
  const options = isGiftBox && activeGiftOptions.length > 0
    ? activeGiftOptions.map((giftOption) => ({
        id: `${membership.id}-${giftOption.id}`,
        title: giftOption.title,
        description: giftOption.description || program.rewardDescription,
      }))
    : [{
        id: `${membership.id}-program`,
        title: program.rewardTitle,
        description: program.rewardDescription,
      }];

  return options.map((option) => ({
    ...option,
    membershipId: membership.id,
    companyId: membership.company.id,
    companyName: membership.company.name,
    icon: program.icon,
    goal,
    current: membership.currentCount,
    left,
    status,
    rewardAvailable: membership.rewardAvailable,
    isGiftBox,
    lastActionAt: membership.lastActionAt,
  }));
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 shrink-0 items-center rounded-2xl px-4 text-sm font-extrabold ${
        active ? "bg-[var(--brand-strong)] text-white" : "border border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      {children}
    </Link>
  );
}

function CompanyFilter({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-9 max-w-44 shrink-0 items-center rounded-full px-3 text-xs font-bold ${
        active ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "border border-[var(--border)] bg-white text-[var(--text-muted)]"
      }`}
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}

function RewardCard({
  reward,
}: {
  reward: ReturnType<typeof buildRewardItems>[number];
}) {
  const progress = Math.min(100, Math.round((reward.current / Math.max(reward.goal, 1)) * 100));

  return (
    <Link
      href={`/app/cards/${reward.membershipId}`}
      className={`block rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm transition active:scale-[0.99] motion-reduce:transition-none ${reward.rewardAvailable ? "border-[var(--gold)]" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${reward.rewardAvailable ? "bg-[rgba(255,180,76,0.28)] text-[#7a4b00]" : "bg-[var(--brand-soft)] text-[var(--brand-strong)]"}`}>
          <span className="text-xl" aria-hidden>{reward.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-[var(--text)]">{reward.title}</h2>
              <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold text-[var(--text-muted)]">
                <Store aria-hidden className="size-4 shrink-0" />
                {reward.companyName}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${reward.rewardAvailable ? "bg-[rgba(255,180,76,0.28)] text-[#7a4b00]" : "bg-[var(--inactive)] text-[var(--text-muted)]"}`}>
              {reward.rewardAvailable ? <Sparkles aria-hidden className="size-3.5" /> : <LockKeyhole aria-hidden className="size-3.5" />}
              {reward.rewardAvailable ? "Готово" : `${reward.left} до цели`}
            </span>
          </div>
          {reward.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">{reward.description}</p>}
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={progress} tone={reward.rewardAvailable ? "warning" : "brand"} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm font-bold">
        <span className="text-[var(--text)]">{reward.rewardAvailable ? "Можно забрать" : pluralPurchasesLeft(reward.left)}</span>
        <span className="text-[var(--brand-strong)]">{reward.rewardAvailable ? "Показать QR для получения" : "Открыть"}</span>
      </div>
      {reward.rewardAvailable && (
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Выдачу подарка подтверждает кассир.</p>
      )}
      {reward.lastActionAt && (
        <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">Последняя операция: {reward.lastActionAt.toLocaleDateString("ru-RU")}</p>
      )}
    </Link>
  );
}
