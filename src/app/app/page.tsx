import QRCode from "qrcode";
import { RaffleStatus, RewardClaimStatus } from "@prisma/client";
import { Gift, Sparkles, Trophy } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { GiftOpenCard } from "@/components/gift-open-card";
import { ProgressIcons } from "@/components/progress-cups";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
import { getClientDashboardMemberships, pickNearestGift } from "@/lib/customer-app";
import { formatDateTime } from "@/lib/format";
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

  const [dynamicQr, memberships, nearestRaffleTicket] = await Promise.all([
    createDynamicCustomerQr(user.id),
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

        {nearestRaffleTicket && <RaffleBanner ticket={nearestRaffleTicket} />}

        <section className={`warm-card p-4 ${nearest?.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex items-start gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${nearest?.rewardAvailable ? "bg-amber-200 text-amber-900" : "bg-green-50 text-green-800"}`}>
              {nearest?.rewardAvailable ? <Sparkles aria-hidden className="size-5" /> : <Gift aria-hidden className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-green-800">Ближайшая плюшка</p>
              {nearest?.company.loyaltyProgram ? (
                <>
                  <h1 className="mt-1 text-xl font-semibold text-[#2f1d13]">{nearest.company.name}</h1>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[#5c3521]">
                    {nearest.rewardAvailable
                      ? nearestUsesGiftBox
                        ? "Подарок готов"
                        : "Подарок доступен"
                      : nearest.company.loyaltyProgram.rewardDescription || `${nearest.currentCount}/${nearest.company.loyaltyProgram.goalCount}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
                  Пока нет активных карт.
                </p>
              )}
            </div>
          </div>
        </section>

        {nearest?.company.loyaltyProgram && (
          <ProgressIcons
            icon={nearest.company.loyaltyProgram.icon}
            current={nearest.currentCount}
            goal={nearest.company.loyaltyProgram.goalCount}
            rewardAvailable={nearest.rewardAvailable}
            rewardTitle={nearest.company.loyaltyProgram.rewardTitle}
            rewardReadyTitle={nearestUsesGiftBox ? "Можно открыть подарок" : "Можно забрать подарок"}
            rewardReadyHint={
              nearest.rewardAvailable
                ? nearestUsesGiftBox
                  ? "Откройте подарок и покажите QR кассиру."
                  : "Покажите QR кассиру."
                : undefined
            }
          />
        )}

        {nearest?.rewardAvailable && nearestUsesGiftBox && (
          <GiftOpenCard
            membershipId={nearest.id}
            companyName={nearest.company.name}
            initialClaim={nearestInitialRewardClaim}
          />
        )}

        <DynamicGlobalQrCard
          initialPayload={dynamicQr.payload}
          initialExpiresAt={dynamicQr.expiresAt}
          manualCodeToken={globalQrToken}
          color="#5c3521"
        />
      </section>
    </main>
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
