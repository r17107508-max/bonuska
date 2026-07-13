import Link from "next/link";
import QRCode from "qrcode";
import { CompanyStatus, RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { leaveCustomerMembership } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GiftOpenCard } from "@/components/gift-open-card";
import { HistoryList } from "@/components/history-list";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { ProgressIcons } from "@/components/progress-cups";
import { QrCard } from "@/components/qr-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { buildRewardQrPayload, isGiftBoxProgram } from "@/lib/loyalty";
import { finalizeDueRafflesForCompany, formatKopeks, prizeTitleForPlace, ticketWinningPlace } from "@/lib/raffles";

export default async function ClientCardPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const user = await requireUser("/company/login");
  const { membershipId } = await params;
  const membership = await getDb().customerMembership.findFirst({
    where: { id: membershipId, userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    include: {
      company: { include: { loyaltyProgram: true, giftOptions: true } },
      user: true,
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!membership || !membership.company.loyaltyProgram) {
    notFound();
  }

  await finalizeDueRafflesForCompany(membership.companyId);

  const program = membership.company.loyaltyProgram;
  const isGiftBox = isGiftBoxProgram(program, membership.company.giftOptions);
  const promoText = program.rewardDescription || program.rewardTitle || `${program.goalCount} покупок — подарок`;
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
          margin: 1,
          width: 360,
          color: { dark: "#92400e", light: "#ffffff" },
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
    <main className="min-h-screen bg-slate-100 px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft aria-hidden className="size-4" />
          Назад
        </Link>

        <header className="rounded-lg p-4 text-white shadow-sm" style={{ backgroundColor: program.themeColor }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold opacity-80">{membership.company.businessType}</p>
              <h1 className="mt-1 text-2xl font-semibold">{membership.company.name}</h1>
              <p className="mt-2 text-sm font-semibold opacity-90">{promoText}</p>
            </div>
            <span className="text-4xl">{program.icon}</span>
          </div>
        </header>

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

        <QrCard token={membership.qrToken} color={program.themeColor} companyName={membership.company.name} />

        <ProgressIcons
          icon={program.icon}
          current={membership.currentCount}
          goal={program.goalCount}
          rewardAvailable={membership.rewardAvailable}
          rewardTitle={promoText}
          rewardReadyTitle={membership.rewardAvailable && isGiftBox ? "Подарок готов" : undefined}
          rewardReadyHint={
            membership.rewardAvailable && isGiftBox
              ? initialRewardClaim
                ? "Покажите QR подарка кассиру."
                : "Откройте подарок и покажите QR кассиру."
              : undefined
          }
        />

        <InstallPwaButton />

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-950">История</h2>
          <HistoryList transactions={membership.transactions} emptyText="Покупок пока нет" />
        </section>

        <form action={leaveCustomerMembership} className="panel p-4">
          <input type="hidden" name="membershipId" value={membership.id} />
          <h2 className="text-lg font-semibold text-slate-950">Участие</h2>
          <p className="mt-1 text-sm text-slate-600">Можно удалить только эту карту.</p>
          <div className="mt-4">
            <ConfirmSubmit
              danger
              title="Выйти из программы?"
              confirmText={`Карта ${membership.company.name}, прогресс и история в этой компании будут удалены. Аккаунт и другие карты сохранятся.`}
              buttonText="Выйти из программы"
            />
          </div>
        </form>
      </section>
    </main>
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
    <section className={`warm-card p-4 ${place ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
          <Trophy aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-amber-800">
            {isDrawn ? "Итоги розыгрыша" : "Ваш номер в розыгрыше"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#2f1d13]">№ {ticket.number}</h2>
          <p className="mt-1 text-sm font-semibold text-[#5c3521]">{ticket.raffle.title}</p>
          {isDrawn ? (
            <p className="mt-2 text-sm leading-5 text-[#7b6a5b]">
              {place
                ? `Вы выиграли ${place} место: ${prizeTitleForPlace(place, ticket.raffle)}`
                : "Ваш номер не попал в победители."}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-5 text-[#7b6a5b]">
              Розыгрыш: {formatDateTime(ticket.raffle.drawAt)}. Покупка: {formatKopeks(ticket.purchaseAmountKopeks)}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
