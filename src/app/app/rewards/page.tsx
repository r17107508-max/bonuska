import Link from "next/link";
import { Gift, LockKeyhole, MapPinned, Search, Sparkles, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, rewardGoal, rewardLeft, type ClientMembership } from "@/lib/customer-app";
import { isGiftBoxProgram } from "@/lib/loyalty";

type RewardTab = "available" | "soon" | "all";

export default async function ClientRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; company?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const memberships = await getClientMemberships(user.id);
  const tab = params.tab === "soon" || params.tab === "all" ? params.tab : "available";
  const companyId = params.company ?? "all";
  const rewards = memberships.flatMap(buildRewardItems);
  const companies = memberships.map((membership) => ({ id: membership.company.id, name: membership.company.name }));
  const filteredRewards = rewards.filter((reward) => {
    const tabMatch = tab === "all" || reward.status === tab;
    const companyMatch = companyId === "all" || reward.companyId === companyId;
    return tabMatch && companyMatch;
  });

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
              <Gift aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-amber-800">Каталог плюшек</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2f1d13]">Награды</h1>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
                Здесь собраны доступные и ближайшие подарки по вашим картам.
              </p>
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          <TabLink active={tab === "available"} href="/app/rewards?tab=available">
            Доступные
          </TabLink>
          <TabLink active={tab === "soon"} href="/app/rewards?tab=soon">
            Скоро
          </TabLink>
          <TabLink active={tab === "all"} href="/app/rewards?tab=all">
            Все
          </TabLink>
        </section>

        {companies.length > 1 && (
          <section className="flex gap-2 overflow-x-auto pb-1">
            <CompanyFilter active={companyId === "all"} href={`/app/rewards?tab=${tab}`}>
              Все места
            </CompanyFilter>
            {companies.map((company) => (
              <CompanyFilter key={company.id} active={companyId === company.id} href={`/app/rewards?tab=${tab}&company=${company.id}`}>
                {company.name}
              </CompanyFilter>
            ))}
          </section>
        )}

        <section className="space-y-3">
          {filteredRewards.map((reward) => (
            <RewardCard key={reward.id} reward={reward} />
          ))}

          {filteredRewards.length === 0 && (
            <div className="warm-card p-5 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                <Search aria-hidden className="size-6" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-[#2f1d13]">Наград пока нет в этом фильтре</h2>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
                Покупайте у партнёров, чтобы открыть подарки и видеть ближайшие цели.
              </p>
              <Link href="/app/partners" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-bold text-white">
                <MapPinned aria-hidden className="size-4" />
                Карта партнёров
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function buildRewardItems(membership: ClientMembership) {
  const program = membership.company.loyaltyProgram;
  if (!program) return [];

  const goal = rewardGoal(membership);
  const left = rewardLeft(membership);
  const status: RewardTab = membership.rewardAvailable ? "available" : left <= 2 ? "soon" : "all";
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
  }));
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 shrink-0 items-center rounded-lg px-4 text-sm font-bold ${
        active ? "bg-green-700 text-white" : "border border-amber-100 bg-white/80 text-[#5c3521]"
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
      className={`inline-flex min-h-9 max-w-44 shrink-0 items-center rounded-lg px-3 text-xs font-bold ${
        active ? "bg-amber-100 text-amber-900" : "border border-amber-100 bg-white/70 text-[#7b6a5b]"
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
  const progress = Math.min(100, Math.round((reward.current / reward.goal) * 100));

  return (
    <Link
      href={`/app/cards/${reward.membershipId}`}
      className={`warm-card block p-4 transition active:scale-[0.99] ${reward.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${reward.rewardAvailable ? "bg-amber-200 text-amber-950" : "bg-green-50 text-green-800"}`}>
          <span className="text-xl" aria-hidden>
            {reward.icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[#2f1d13]">{reward.title}</h2>
              <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold text-[#7b6a5b]">
                <Store aria-hidden className="size-4 shrink-0" />
                {reward.companyName}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${reward.rewardAvailable ? "bg-amber-100 text-amber-900" : "bg-white text-[#7b6a5b]"}`}>
              {reward.rewardAvailable ? <Sparkles aria-hidden className="size-3.5" /> : <LockKeyhole aria-hidden className="size-3.5" />}
              {reward.rewardAvailable ? "Доступно" : `${reward.left} до цели`}
            </span>
          </div>
          {reward.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#7b6a5b]">{reward.description}</p>}
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-100">
        <div className={`h-full rounded-full ${reward.rewardAvailable ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="text-[#5c3521]">{reward.rewardAvailable ? "Можно забрать" : `${reward.current}/${reward.goal}`}</span>
        <span className="text-green-800">{reward.isGiftBox && reward.rewardAvailable ? "Открыть подарок" : "Открыть карту"}</span>
      </div>
    </Link>
  );
}
