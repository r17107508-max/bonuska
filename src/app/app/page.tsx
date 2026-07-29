import QRCode from "qrcode";
import Link from "next/link";
import { ArrowRight, Gift, QrCode, Trophy } from "lucide-react";
import { LoyaltyTransactionType, RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientCard, ClientEmptyState, ClientShell, LogoBox, PartnerBadge, ProgramSummaryCard, ProgressBar, QuickQrButton, pluralPurchasesLeft } from "@/components/client-ui";
import { GiftOpenCard } from "@/components/gift-open-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { getActivePartnerCompanies, getClientMemberships, pickNearestGift, rewardGoal, rewardLeft, type ClientMembership } from "@/lib/customer-app";
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
    select: { id: true, name: true, city: true },
  });

  await finalizeDueRafflesForUser(user.id);

  const [memberships, nearestRaffleTicket, recentTransactions, nearbyPartners] = await Promise.all([
    getClientMemberships(user.id),
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
      take: 3,
    }),
    getActivePartnerCompanies(user.city, 4),
  ]);

  const nearest = pickNearestGift(memberships) as ClientMembership | null;
  const otherMemberships = memberships.filter((membership) => membership.id !== nearest?.id);
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
          margin: 2,
          width: 360,
          color: { dark: "#1F1B18", light: "#ffffff" },
        }),
      }
    : null;

  return (
    <ClientShell>
      <ClientBrandHeader greeting={`Привет, ${user.name}`} />

      {params.error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-[var(--danger)]">{params.error}</p>}

      {memberships.length === 0 ? (
        <ClientEmptyState
          image="client-first-card"
          alt="Иллюстрация первой карты лояльности"
          title="Начните собирать первую плюшку"
          text="Выберите партнёра и покажите QR при покупке."
          actionHref="/app/partners"
          actionLabel="Найти партнёра"
        />
      ) : (
        <>
          {nearest && <NearestGiftHero membership={nearest} />}

          {nearestRaffleTicket && <RaffleBanner ticket={nearestRaffleTicket} />}

          {nearest?.rewardAvailable && nearestUsesGiftBox && (
            <GiftOpenCard
              membershipId={nearest.id}
              companyName={nearest.company.name}
              initialClaim={nearestInitialRewardClaim}
            />
          )}

          {otherMemberships.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold text-[var(--text)]">Остальные программы</h2>
                <Link href="/app/cards" className="text-sm font-bold text-[var(--brand-strong)]">Все</Link>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {otherMemberships.map((membership) => (
                  <div key={membership.id} className="w-[82%] max-w-[320px] shrink-0">
                    <ProgramSummaryCard
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
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ClientCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--text)]">Партнёры рядом</h2>
          <Link href="/app/partners" className="text-sm font-bold text-[var(--brand-strong)]">Карта</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {nearbyPartners.map((partner) => (
            <Link key={partner.id} href={`/app/companies/${partner.slug}`} className="flex min-h-20 min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-3">
              <LogoBox logoUrl={partner.logoUrl} fallback={partner.loyaltyProgram?.icon ?? partner.icon} name={partner.name} color={partner.themeColor} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-[var(--text)]">{partner.name}</span>
                <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{partner.loyaltyProgram?.rewardDescription || `${partner.loyaltyProgram?.goalCount ?? 6} покупок - подарок`}</span>
              </span>
              <ArrowRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
            </Link>
          ))}
          {nearbyPartners.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Партнёры появятся после выбора города в профиле.</p>
          )}
        </div>
      </ClientCard>

      <ClientCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--text)]">Последние операции</h2>
          <Link href="/app/history" className="text-sm font-bold text-[var(--brand-strong)]">Вся история</Link>
        </div>
        <div className="space-y-2">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                {transaction.type === LoyaltyTransactionType.PURCHASE ? <QrCode aria-hidden className="size-5" /> : <Gift aria-hidden className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[var(--text)]">{transaction.company.name}</span>
                <span className="block text-sm text-[var(--text-muted)]">{clientOperationLabel(transaction.type, transaction.quantity)}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-[var(--text-muted)]">{formatDate(transaction.createdAt)}</span>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Покажите QR при покупке, и здесь появится подтверждение.</p>
          )}
        </div>
      </ClientCard>
    </ClientShell>
  );
}

function NearestGiftHero({
  membership,
}: {
  membership: ClientMembership;
}) {
  const program = membership.company.loyaltyProgram!;
  const goal = rewardGoal(membership);
  const left = rewardLeft(membership);
  const progress = membership.rewardAvailable ? 100 : Math.round((membership.currentCount / Math.max(goal, 1)) * 100);
  const color = program.themeColor || membership.company.themeColor || "#C94726";

  return (
    <ClientCard className="overflow-hidden p-0">
      <div className="p-5" style={{ borderTop: `8px solid ${color}` }}>
        <div className="flex items-start gap-3">
          <LogoBox logoUrl={membership.company.logoUrl} fallback={program.icon || membership.company.icon} name={membership.company.name} color={color} className="size-14" />
          <div className="min-w-0 flex-1">
            <PartnerBadge>Ближайший подарок</PartnerBadge>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[var(--text)]">
              {membership.rewardAvailable ? "Подарок готов" : pluralPurchasesLeft(left)}
            </h1>
            <p className="mt-2 text-base font-bold text-[var(--text)]">{program.rewardTitle || "Подарок"}</p>
            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{membership.company.name} · {membership.company.businessType}</p>
          </div>
        </div>

        <div className="mt-5">
          <ProgressBar value={progress} tone={membership.rewardAvailable ? "warning" : "brand"} />
          <div className="mt-2 flex items-center justify-between text-sm font-bold text-[var(--text-muted)]">
            <span>{membership.currentCount} из {goal}</span>
            {membership.lastActionAt && <span>Последняя: {formatDate(membership.lastActionAt)}</span>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <QuickQrButton />
          <Link href={`/app/cards/${membership.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-extrabold text-[var(--text)]">
            Открыть программу
            <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
      </div>
    </ClientCard>
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
    <ClientCard className={place ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,180,76,0.25)] text-[#7a4b00]">
          <Trophy aria-hidden className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[#7a4b00]">{drawn ? "Результат розыгрыша" : "Розыгрыш скоро"}</p>
          <h2 className="mt-1 text-lg font-extrabold text-[var(--text)]">{ticket.raffle.company.name}: № {ticket.number}</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
            {drawn
              ? place
                ? `Вы выиграли ${place} место: ${prizeTitleForPlace(place, ticket.raffle)}`
                : "Итоги зафиксированы. Ваш номер не попал в победители."
              : `${ticket.raffle.title}. Розыгрыш: ${formatDateTime(ticket.raffle.drawAt)}.`}
          </p>
        </div>
      </div>
    </ClientCard>
  );
}

function clientOperationLabel(type: LoyaltyTransactionType, quantity: number) {
  const labels: Record<LoyaltyTransactionType, string> = {
    PURCHASE: quantity > 1 ? `Начислено покупок: ${quantity}` : "Покупка начислена",
    LEVEL_UP: "Достигнут новый уровень",
    REWARD_OPENED: "Подарок открыт",
    REWARD_REDEEMED: "Подарок выдан",
    REWARD_GRANTED: "Подарок выдан",
    MANUAL_ADJUSTMENT: "Ручное изменение",
  };

  return labels[type];
}
