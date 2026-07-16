import QRCode from "qrcode";
import Link from "next/link";
import { Gift, MapPinned, QrCode, Sparkles, Trophy, WalletCards } from "lucide-react";
import { LoyaltyTransactionType, RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { GiftOpenCard } from "@/components/gift-open-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { buildManualScanCode } from "@/lib/scan-codes";
import { getClientDashboardMemberships, pickNearestGift, rewardGoal } from "@/lib/customer-app";
import { buildRewardQrPayload, ensureGlobalQrToken, isGiftBoxProgram } from "@/lib/loyalty";
import { finalizeDueRafflesForUser, prizeTitleForPlace, ticketWinningPlace } from "@/lib/raffles";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [currentUser, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const user = await getDb().user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { id: true, name: true, globalQrToken: true },
  });

  const globalQrToken = await ensureGlobalQrToken(user);
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
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <section className="warm-card overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-800">Здравствуйте, {user.name}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-[#2f1d13]">Ваш wallet с плюшками</h1>
              <p className="mt-2 text-sm leading-5 text-[#7b6a5b]">
                QR, награды и карты любимых мест в одном экране.
              </p>
            </div>
            <div className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-green-700 text-white">
              <QrCode aria-hidden className="size-7" />
            </div>
          </div>

          <Link href="/app/qr" className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-lg bg-green-700 px-4 text-white shadow-lg shadow-green-900/15">
            <span>
              <span className="block text-sm font-bold">Показать QR кассиру</span>
              <span className="mt-0.5 block font-mono text-xs font-semibold text-green-50">
                Код: {buildManualScanCode(globalQrToken, "customer")}
              </span>
            </span>
            <QrCode aria-hidden className="size-6 shrink-0" />
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
              <p className="text-xs font-semibold uppercase text-[#7b6a5b]">Мои карты</p>
              <h2 className="mt-1 text-lg font-semibold text-[#2f1d13]">Активные программы</h2>
            </div>
            <Link href="/app/cards" className="text-sm font-bold text-green-800">
              Все
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {memberships.slice(0, 3).map((membership) => (
              <Link key={membership.id} href={`/app/cards/${membership.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white/70 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#2f1d13]">{membership.company.name}</p>
                  <p className="mt-0.5 text-sm text-[#7b6a5b]">
                    {membership.rewardAvailable ? "Подарок готов" : `${membership.currentCount}/${rewardGoal(membership)}`}
                  </p>
                </div>
                <span className="text-xl" aria-hidden>
                  {membership.company.loyaltyProgram?.icon ?? "🎁"}
                </span>
              </Link>
            ))}
            {memberships.length === 0 && (
              <p className="rounded-lg border border-dashed border-amber-200 p-3 text-sm leading-5 text-[#7b6a5b]">
                Карт пока нет. Откройте партнёров и выберите компанию.
              </p>
            )}
          </div>
        </section>

        <section className="warm-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#7b6a5b]">Активность</p>
              <h2 className="mt-1 text-lg font-semibold text-[#2f1d13]">Последние операции</h2>
            </div>
            <Link href="/app/history" className="text-sm font-bold text-green-800">
              История
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-lg border border-amber-100 bg-white/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#2f1d13]">{transaction.company.name}</p>
                    <p className="mt-0.5 text-sm text-[#7b6a5b]">{clientOperationLabel(transaction.type)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-[#7b6a5b]">{formatDate(transaction.createdAt)}</p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="rounded-lg border border-dashed border-amber-200 p-3 text-sm leading-5 text-[#7b6a5b]">
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
        <p className="text-xs font-semibold uppercase text-green-800">Ближайшая плюшка</p>
        <h2 className="mt-1 text-lg font-semibold text-[#2f1d13]">Пока нет активных карт</h2>
        <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">Выберите партнёра и присоединитесь к программе.</p>
      </section>
    );
  }

  const goal = rewardGoal(membership);
  const progress = Math.min(100, Math.round((membership.currentCount / goal) * 100));

  return (
    <Link href={`/app/cards/${membership.id}`} className={`warm-card block p-4 transition active:scale-[0.99] ${membership.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${membership.rewardAvailable ? "bg-amber-200 text-amber-950" : "bg-green-50 text-green-800"}`}>
          {membership.rewardAvailable ? <Sparkles aria-hidden className="size-6" /> : <Gift aria-hidden className="size-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-green-800">Ближайшая плюшка</p>
          <h2 className="mt-1 truncate text-xl font-semibold text-[#2f1d13]">{membership.company.name}</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#5c3521]">
            {membership.rewardAvailable
              ? "Подарок готов"
              : membership.company.loyaltyProgram.rewardDescription || `${membership.currentCount}/${goal}`}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-100">
        <div className={`animated-progress h-full rounded-full ${membership.rewardAvailable ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-[#7b6a5b]">
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
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-amber-100 bg-white/80 p-2 text-center text-sm font-bold text-[#2f1d13] shadow-sm active:bg-amber-50">
      <Icon aria-hidden className="size-5 text-green-800" />
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
    <section className={`warm-card p-4 ${place ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
          <Trophy aria-hidden className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-amber-800">{drawn ? "Результат розыгрыша" : "Розыгрыш скоро"}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#2f1d13]">
            {ticket.raffle.company.name}: № {ticket.number}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
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
