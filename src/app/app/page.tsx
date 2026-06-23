import QRCode from "qrcode";
import { RewardClaimStatus } from "@prisma/client";
import { Gift, Sparkles } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { GiftOpenCard } from "@/components/gift-open-card";
import { ProgressIcons } from "@/components/progress-cups";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
import { getClientDashboardMemberships, pickNearestGift, rewardLeft } from "@/lib/customer-app";
import { buildRewardQrPayload, ensureGlobalQrToken, isGiftBoxProgram } from "@/lib/loyalty";

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

  const [dynamicQr, memberships] = await Promise.all([
    createDynamicCustomerQr(user.id),
    getClientDashboardMemberships(user.id),
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
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <section className={`warm-card p-5 ${nearest?.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex items-start gap-3">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${nearest?.rewardAvailable ? "bg-amber-200 text-amber-900" : "bg-green-50 text-green-800"}`}>
              {nearest?.rewardAvailable ? <Sparkles aria-hidden className="size-6" /> : <Gift aria-hidden className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase text-green-800">Ближайшая плюшка</p>
              {nearest?.company.loyaltyProgram ? (
                <>
                  <h1 className="mt-1 text-2xl font-semibold text-[#2f1d13]">{nearest.company.name}</h1>
                  <p className="mt-1 text-sm font-semibold text-[#5c3521]">
                    {nearest.rewardAvailable
                      ? nearestUsesGiftBox
                        ? "Подарок готов. Откройте коробку в карте."
                        : "Подарок доступен. Покажите QR кассиру."
                      : `До подарка осталось ${pluralPurchases(rewardLeft(nearest))}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm leading-6 text-[#7b6a5b]">
                  Пока нет активных карт. Найдите партнёра и начните копить плюшки.
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
                  ? "Нажмите «Открыть подарок», узнайте плюшку и покажите подарочный QR кассиру."
                  : "Покажите QR-код кассиру перед оплатой, чтобы забрать подарок."
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

function pluralPurchases(value: number) {
  const abs = Math.abs(value);
  const last = abs % 10;
  const lastTwo = abs % 100;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${value} покупок`;
  }

  if (last === 1) {
    return `${value} покупка`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} покупки`;
  }

  return `${value} покупок`;
}
