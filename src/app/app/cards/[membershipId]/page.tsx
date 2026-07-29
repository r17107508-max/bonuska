import QRCode from "qrcode";
import Link from "next/link";
import { CompanyStatus, LoyaltyTransactionType, RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Gift, History, MapPinned, Trophy } from "lucide-react";
import { leaveCustomerMembership } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ClientCard, ClientShell, LogoBox, ProgramProgressDots, ProgressBar, QuickQrButton, RouteButton, pluralPurchasesLeft } from "@/components/client-ui";
import { GiftOpenCard } from "@/components/gift-open-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { buildRewardQrPayload, isGiftBoxProgram } from "@/lib/loyalty";
import { finalizeDueRafflesForCompany, formatKopeks, prizeTitleForPlace, ticketWinningPlace } from "@/lib/raffles";

type ProgramTab = "progress" | "history" | "rules";

export default async function ClientCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ membershipId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, routeParams, query] = await Promise.all([requireUser("/company/login"), params, searchParams]);
  const tab: ProgramTab = query.tab === "history" || query.tab === "rules" ? query.tab : "progress";
  const membership = await getDb().customerMembership.findFirst({
    where: { id: routeParams.membershipId, userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    include: {
      company: { include: { loyaltyProgram: true, giftOptions: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!membership || !membership.company.loyaltyProgram) {
    notFound();
  }

  await finalizeDueRafflesForCompany(membership.companyId);

  const program = membership.company.loyaltyProgram;
  const goal = program.goalCount;
  const left = membership.rewardAvailable ? 0 : Math.max(goal - membership.currentCount, 0);
  const progress = membership.rewardAvailable ? 100 : Math.round((membership.currentCount / Math.max(goal, 1)) * 100);
  const promoText = program.rewardDescription || program.rewardTitle || `${program.goalCount} покупок - подарок`;
  const fullAddress = [membership.company.city, membership.company.address].filter(Boolean).join(", ");
  const isGiftBox = isGiftBoxProgram(program, membership.company.giftOptions);
  const activeRewardClaim = isGiftBox && membership.rewardAvailable
    ? await getDb().rewardClaim.findFirst({
        where: {
          membershipId: membership.id,
          status: { in: [RewardClaimStatus.OPENED, RewardClaimStatus.AVAILABLE] },
        },
        orderBy: [{ openedAt: "desc" }, { createdAt: "asc" }],
      })
    : null;
  const initialRewardClaim = activeRewardClaim?.status === RewardClaimStatus.OPENED
    ? {
        id: activeRewardClaim.id,
        status: activeRewardClaim.status,
        title: activeRewardClaim.title,
        description: activeRewardClaim.description,
        rewardQrToken: activeRewardClaim.token,
        qrDataUrl: await QRCode.toDataURL(buildRewardQrPayload(activeRewardClaim.token), {
          margin: 2,
          width: 360,
          color: { dark: "#1F1B18", light: "#ffffff" },
        }),
      }
    : null;
  const raffleTickets = await getDb().raffleTicket.findMany({
    where: {
      membershipId: membership.id,
      raffle: {
        status: { in: [RaffleStatus.ACTIVE, RaffleStatus.DRAWN] },
      },
    },
    include: { raffle: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <ClientShell>
      <Link href="/app" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-extrabold text-[var(--text)]">
        <ArrowLeft aria-hidden className="size-4" />
        Назад
      </Link>

      <ClientCard className="overflow-hidden p-0">
        <div className="p-5" style={{ borderTop: `8px solid ${program.themeColor}` }}>
          <div className="flex items-start gap-3">
            <LogoBox logoUrl={membership.company.logoUrl} fallback={program.icon || membership.company.icon} name={membership.company.name} color={program.themeColor} className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-muted)]">{membership.company.businessType}</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight text-[var(--text)]">{membership.company.name}</h1>
              <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{membership.company.description}</p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-[var(--inactive)] p-4">
            <p className="text-sm font-bold text-[var(--text-muted)]">Награда</p>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">{program.rewardTitle || "Подарок"}</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{promoText}</p>
            <div className="mt-4">
              <ProgressBar value={progress} tone={membership.rewardAvailable ? "warning" : "brand"} />
            </div>
            <p className="mt-2 text-sm font-bold text-[var(--text)]">
              {membership.rewardAvailable ? "Подарок доступен" : pluralPurchasesLeft(left)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickQrButton label="Показать мой QR" />
            {fullAddress && <RouteButton address={fullAddress} />}
          </div>
        </div>
      </ClientCard>

      {membership.rewardAvailable && isGiftBox && (
        <GiftOpenCard
          membershipId={membership.id}
          companyName={membership.company.name}
          initialClaim={initialRewardClaim}
        />
      )}

      {raffleTickets.map((ticket) => (
        <RaffleTicketCard key={ticket.id} ticket={ticket} />
      ))}

      <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Разделы программы">
        <TabLink active={tab === "progress"} href={`/app/cards/${membership.id}`} icon={Gift}>Прогресс</TabLink>
        <TabLink active={tab === "history"} href={`/app/cards/${membership.id}?tab=history`} icon={History}>История</TabLink>
        <TabLink active={tab === "rules"} href={`/app/cards/${membership.id}?tab=rules`} icon={BookOpen}>Правила</TabLink>
      </section>

      {tab === "progress" && (
        <ClientCard>
          <h2 className="text-xl font-extrabold text-[var(--text)]">Прогресс</h2>
          <div className="mt-4">
            <ProgramProgressDots icon={program.icon} current={membership.currentCount} goal={goal} rewardAvailable={membership.rewardAvailable} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[var(--inactive)] p-3">
              <dt className="text-[var(--text-muted)]">Покупок всего</dt>
              <dd className="mt-1 text-2xl font-extrabold text-[var(--text)]">{membership.totalPurchases}</dd>
            </div>
            <div className="rounded-2xl bg-[var(--inactive)] p-3">
              <dt className="text-[var(--text-muted)]">Подарков выдано</dt>
              <dd className="mt-1 text-2xl font-extrabold text-[var(--text)]">{membership.totalRewards}</dd>
            </div>
          </dl>
          {membership.lastActionAt && <p className="mt-3 text-sm text-[var(--text-muted)]">Последняя операция: {formatDate(membership.lastActionAt)}</p>}
        </ClientCard>
      )}

      {tab === "history" && (
        <ClientCard>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-[var(--text)]">История у партнёра</h2>
            <Link href="/app/history" className="text-sm font-bold text-[var(--brand-strong)]">Вся история</Link>
          </div>
          <div className="space-y-2">
            {membership.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[var(--text)]">{operationLabel(transaction.type, transaction.quantity)}</p>
                  <time className="shrink-0 text-xs font-bold text-[var(--text-muted)]" dateTime={transaction.createdAt.toISOString()}>{formatDateTime(transaction.createdAt)}</time>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Прогресс: {transaction.countAfter} из {goal}</p>
                {transaction.rewardTitle && <p className="mt-1 text-sm font-bold text-[#7a4b00]">Подарок: {transaction.rewardTitle}</p>}
              </div>
            ))}
            {membership.transactions.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Покупок у этого партнёра пока нет.</p>
            )}
          </div>
        </ClientCard>
      )}

      {tab === "rules" && (
        <ClientCard>
          <h2 className="text-xl font-extrabold text-[var(--text)]">Правила</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
            <p>Покажите универсальный QR кассиру при покупке. Начисление и выдачу подарка подтверждает сотрудник партнёра.</p>
            <p>Цель программы: {goal} покупок. Награда: {program.rewardTitle || "подарок"}.</p>
            {program.rewardDescription && <p>{program.rewardDescription}</p>}
            {membership.company.address && (
              <p className="inline-flex gap-2">
                <MapPinned aria-hidden className="mt-1 size-4 shrink-0 text-[var(--brand-strong)]" />
                {fullAddress}
              </p>
            )}
          </div>

          <form action={leaveCustomerMembership} className="mt-6 border-t border-[var(--border)] pt-4">
            <input type="hidden" name="membershipId" value={membership.id} />
            <h3 className="text-base font-extrabold text-[var(--text)]">Покинуть программу</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">Будет удалена только эта карта, её прогресс и история у партнёра. Аккаунт и другие карты сохранятся.</p>
            <div className="mt-4">
              <ConfirmSubmit
                danger
                title="Выйти из программы?"
                confirmText={`Карта ${membership.company.name}, прогресс и история в этой компании будут удалены. Аккаунт и другие карты сохранятся.`}
                buttonText="Покинуть программу"
              />
            </div>
          </form>
        </ClientCard>
      )}
    </ClientShell>
  );
}

function TabLink({ active, href, icon: Icon, children }: { active: boolean; href: string; icon: typeof Gift; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold ${
        active ? "bg-[var(--brand-strong)] text-white" : "border border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

function RaffleTicketCard({
  ticket,
}: {
  ticket: {
    id: string;
    number: number;
    purchaseAmountKopeks: number;
    raffle: {
      title: string;
      status: RaffleStatus;
      participationEndsAt: Date;
      drawAt: Date;
      firstPrizeTitle: string;
      secondPrizeTitle: string;
      thirdPrizeTitle: string;
      winner1TicketId: string | null;
      winner2TicketId: string | null;
      winner3TicketId: string | null;
    };
  };
}) {
  const place = ticketWinningPlace(ticket.id, ticket.raffle);
  const isDrawn = ticket.raffle.status === RaffleStatus.DRAWN;

  return (
    <ClientCard className={place ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,180,76,0.28)] text-[#7a4b00]">
          <Trophy aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-[#7a4b00]">
            {isDrawn ? "Итоги розыгрыша" : "Ваш номер в розыгрыше"}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">№ {ticket.number}</h2>
          <p className="mt-1 text-sm font-bold text-[var(--text)]">{ticket.raffle.title}</p>
          <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">
            {isDrawn
              ? place
                ? `Вы выиграли ${place} место: ${prizeTitleForPlace(place, ticket.raffle)}`
                : "Ваш номер не попал в победители."
              : `Розыгрыш: ${formatDateTime(ticket.raffle.drawAt)}. Покупка: ${formatKopeks(ticket.purchaseAmountKopeks)}.`}
          </p>
        </div>
      </div>
    </ClientCard>
  );
}

function operationLabel(type: LoyaltyTransactionType, quantity: number) {
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
