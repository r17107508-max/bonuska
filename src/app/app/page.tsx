import QRCode from "qrcode";
import Link from "next/link";
import { Check, Gift, MapPinned, QrCode, Sparkles, Trophy, WalletCards } from "lucide-react";
import { LoyaltyTransactionType, RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { GiftOpenCard } from "@/components/gift-open-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { getClientDashboardMemberships, pickNearestGift, rewardGoal } from "@/lib/customer-app";
import { buildRewardQrPayload, isGiftBoxProgram } from "@/lib/loyalty";
import { finalizeDueRafflesForUser, prizeTitleForPlace, ticketWinningPlace } from "@/lib/raffles";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [currentUser, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const user = await getDb().user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { id: true, name: true },
  });

  await finalizeDueRafflesForUser(user.id);

  const [memberships, nearestRaffleTicket, recentTransactions] = await Promise.all([
    getClientDashboardMemberships(user.id),
    getDb().raffleTicket.findFirst({
      where: {
        userId: user.id,
        raffle: {
          status: { in: [RaffleStatus.ACTIVE, RaffleStatus.DRAWN] },
        },
      },
      include: {
        raffle: {
          include: {
            company: { select: { name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    getDb().loyaltyTransaction.findMany({
      where: { membership: { userId: user.id } },
      include: { company: { include: { loyaltyProgram: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  const nearest = pickNearestGift(memberships);
  const heroGoal = nearest ? rewardGoal(nearest) : 10;
  const heroCurrent = nearest ? Math.min(nearest.currentCount, heroGoal) : 0;
  const heroLeft = Math.max(0, heroGoal - heroCurrent);
  const heroProgress = nearest?.rewardAvailable ? 100 : Math.round((heroCurrent / Math.max(heroGoal, 1)) * 100);
  const nearestUsesGiftBox = nearest?.company.loyaltyProgram
    ? isGiftBoxProgram(nearest.company.loyaltyProgram, nearest.company.giftOptions)
    : false;
  const nearestRewardClaim = nearest?.rewardAvailable && nearestUsesGiftBox
    ? await getDb().rewardClaim.findFirst({
        where: {
          membershipId: nearest.id,
          status: { in: [RewardClaimStatus.OPENED, RewardClaimStatus.AVAILABLE] },
        },
        orderBy: [{ openedAt: "desc" }, { createdAt: "asc" }],
      })
    : null;
  const nearestInitialRewardClaim = nearestRewardClaim?.status === RewardClaimStatus.OPENED
    ? {
        id: nearestRewardClaim.id,
        rewardClaimId: nearestRewardClaim.id,
        status: nearestRewardClaim.status,
        title: nearestRewardClaim.title,
        description: nearestRewardClaim.description,
        rewardQrToken: nearestRewardClaim.token,
        qrDataUrl: await QRCode.toDataURL(buildRewardQrPayload(nearestRewardClaim.token), {
          margin: 1,
          width: 360,
          color: { dark: "#92400e", light: "#ffffff" },
        }),
      }
    : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <section className="digital-card overflow-hidden rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#5f250f]">Здравствуйте, {user.name}</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight text-[var(--text)]">
                {nearest ? `${heroCurrent} из ${heroGoal}` : "Ваш QR готов"}
              </h1>
              <p className="mt-2 text-sm font-extrabold leading-5 text-[#5f250f]">
                {nearest?.rewardAvailable
                  ? "Подарок доступен сейчас"
                  : nearest
                    ? `До подарка осталось ${heroLeft} покупок`
                    : "Покажите QR у партнёра, чтобы начать копить покупки"}
              </p>
            </div>
            <div className="flex size-13 shrink-0 items-center justify-center rounded-[16px] bg-white/45 text-[var(--text)] ring-1 ring-white/50">
              <QrCode aria-hidden className="size-7" />
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/24">
            <div className="animated-progress h-full rounded-full bg-white" style={{ width: `${heroProgress}%` }} />
          </div>
          {nearest && (
            <div className="motion-track mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: Math.min(heroGoal, 10) }).map((_, index) => {
                const filled = index < Math.min(heroCurrent, 10);
                return (
                  <span
                    key={index}
                    className={`relative z-10 flex aspect-square items-center justify-center rounded-[14px] text-xs font-black ${
                      filled ? "bg-white text-[var(--brand)]" : "bg-white/16 text-white ring-1 ring-white/22"
                    }`}
                    aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
                  >
                    {filled ? <Check aria-hidden className="size-4" /> : index + 1}
                  </span>
                );
              })}
            </div>
          )}
          {nearest && (
          <p className="mt-4 text-sm font-extrabold text-[var(--text)]">
              Следующий подарок: {nearest.company.loyaltyProgram?.rewardTitle ?? nearest.company.loyaltyProgram?.rewardDescription ?? "подарок"}
            </p>
          )}

          <Link href="/app/qr" className="mt-5 flex min-h-14 items-center justify-between gap-3 rounded-[16px] bg-white px-4 text-[var(--text)] shadow-lg shadow-black/10">
            <span>
              <span className="block text-sm font-bold">Показать QR кассиру</span>
              <span className="mt-0.5 block text-xs font-semibold text-[var(--text-muted)]">Открыть QR-код</span>
            </span>
            <QrCode aria-hidden className="size-6 shrink-0 text-[var(--brand)]" />
          </Link>
        </section>

        {nearestRaffleTicket && <RaffleBanner ticket={nearestRaffleTicket} />}

        <NearestRewardCard membership={nearest} />

        {nearest?.rewardAvailable && nearestUsesGiftBox && (
          <GiftOpenCard
            membershipId={nearest.id}
            companyName={nearest.company.name}
            initialClaim={nearestInitialRewardClaim}
          />
        )}

        <section className="grid grid-cols-3 gap-2">
          <QuickAction href="/app/rewards" icon={Gift} title="Награды" />
          <QuickAction href="/app/partners" icon={MapPinned} title="Партнёры" />
          <QuickAction href="/app/cards" icon={WalletCards} title="Карты" />
        </section>

        <section className="warm-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Мои карты</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Активные программы</h2>
            </div>
            <Link href="/app/cards" className="text-sm font-bold text-[var(--brand)]">
              Все
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {memberships.slice(0, 3).map((membership) => (
              <Link key={membership.id} href={`/app/cards/${membership.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white/70 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text)]">{membership.company.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {membership.rewardAvailable ? "Подарок готов" : `${membership.currentCount}/${rewardGoal(membership)}`}
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-[12px] bg-[var(--brand-soft)] text-[var(--brand)]" aria-hidden>
                  <Gift className="size-5" />
                </span>
              </Link>
            ))}
            {memberships.length === 0 && (
              <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm leading-5 text-[var(--text-muted)]">
                Карт пока нет. Откройте партнёров и выберите компанию.
              </p>
            )}
          </div>
        </section>

        <section className="warm-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Активность</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Последние операции</h2>
            </div>
            <Link href="/app/history" className="text-sm font-bold text-[var(--brand)]">
              История
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-lg border border-[var(--border)] bg-white/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text)]">{transaction.company.name}</p>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">{clientOperationLabel(transaction.type)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">{formatDate(transaction.createdAt)}</p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm leading-5 text-[var(--text-muted)]">
                Истории пока нет. Покажите QR при следующей покупке.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function NearestRewardCard({
  membership,
}: {
  membership: ReturnType<typeof pickNearestGift>;
}) {
  if (!membership?.company.loyaltyProgram) {
    return (
      <section className="warm-card p-4">
        <p className="text-xs font-semibold uppercase text-[var(--brand)]">Ближайшая плюшка</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Пока нет активных карт</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">Выберите партнёра и присоединитесь к программе.</p>
      </section>
    );
  }

  const goal = rewardGoal(membership);
  const progress = Math.min(100, Math.round((membership.currentCount / goal) * 100));

  return (
    <Link href={`/app/cards/${membership.id}`} className={`warm-card block p-4 transition active:scale-[0.99] ${membership.rewardAvailable ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${membership.rewardAvailable ? "bg-[rgba(255,200,87,0.44)] text-[#5f3a00]" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`}>
          {membership.rewardAvailable ? <Sparkles aria-hidden className="size-6" /> : <Gift aria-hidden className="size-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-[var(--brand)]">Ближайшая плюшка</p>
          <h2 className="mt-1 truncate text-xl font-semibold text-[var(--text)]">{membership.company.name}</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text)]">
            {membership.rewardAvailable
              ? "Подарок готов"
              : membership.company.loyaltyProgram.rewardDescription || `${membership.currentCount}/${goal}`}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(255,200,87,0.25)]">
        <div className={`animated-progress h-full rounded-full ${membership.rewardAvailable ? "bg-[var(--gold)]" : "bg-[var(--brand)]"}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
        {membership.rewardAvailable ? "Откройте карту, чтобы забрать подарок." : `${membership.currentCount} из ${goal} покупок`}
      </p>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: typeof Gift;
  title: string;
}) {
  return (
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white/80 p-2 text-center text-sm font-bold text-[var(--text)] shadow-sm active:bg-[var(--inactive)]">
      <Icon aria-hidden className="size-5 text-[var(--brand)]" />
      {title}
    </Link>
  );
}

function RaffleBanner({
  ticket,
}: {
  ticket: {
    id: string;
    number: number;
    raffle: {
      title: string;
      status: RaffleStatus;
      drawAt: Date;
      firstPrizeTitle: string;
      secondPrizeTitle: string;
      thirdPrizeTitle: string;
      winner1TicketId: string | null;
      winner2TicketId: string | null;
      winner3TicketId: string | null;
      company: { name: string };
    };
  };
}) {
  const place = ticketWinningPlace(ticket.id, ticket.raffle);
  const drawn = ticket.raffle.status === RaffleStatus.DRAWN;

  return (
    <section className={`warm-card p-4 ${place ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,200,87,0.25)] text-[#7a4b00]">
          <Trophy aria-hidden className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[#7a4b00]">{drawn ? "Результат розыгрыша" : "Розыгрыш скоро"}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            {ticket.raffle.company.name}: № {ticket.number}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
            {drawn
              ? place
                ? `Вы выиграли ${place} место: ${prizeTitleForPlace(place, ticket.raffle)}`
                : "Итоги зафиксированы. Ваш номер не попал в победители."
              : `${ticket.raffle.title}. Розыгрыш: ${formatDateTime(ticket.raffle.drawAt)}.`}
          </p>
        </div>
      </div>
    </section>
  );
}

function clientOperationLabel(type: LoyaltyTransactionType) {
  const labels: Record<LoyaltyTransactionType, string> = {
    PURCHASE: "Начислена покупка",
    LEVEL_UP: "Достигнут новый уровень",
    REWARD_OPENED: "Открыт подарок",
    REWARD_REDEEMED: "Выдан подарок",
    REWARD_GRANTED: "Выдан подарок",
    MANUAL_ADJUSTMENT: "Ручное изменение",
  };

  return labels[type];
}
