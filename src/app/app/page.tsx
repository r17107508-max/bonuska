import QRCode from "qrcode";
import { LoyaltyProgramType, RewardClaimStatus } from "@prisma/client";
import { Gift } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { GiftOpenCard } from "@/components/gift-open-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
import { getClientDashboardMemberships, pickNearestGift, rewardLeft } from "@/lib/customer-app";
import { buildRewardQrPayload, ensureGlobalQrToken, isGiftBoxProgram } from "@/lib/loyalty";
import { calculateLoyaltyLevel } from "@/lib/loyalty-levels";

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

  await ensureGlobalQrToken(user);

  const [dynamicQr, memberships] = await Promise.all([
    createDynamicCustomerQr(user.id),
    getClientDashboardMemberships(user.id),
  ]);
  const nearest = pickNearestGift(memberships);
  const nearestLevelMembership = memberships.find((membership) => membership.company.loyaltyProgram?.programType === LoyaltyProgramType.CUSTOMER_LEVELS) ?? null;
  const nearestLevelProgress = nearestLevelMembership
    ? calculateLoyaltyLevel(nearestLevelMembership.totalPurchases, nearestLevelMembership.company.loyaltyLevels)
    : null;
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
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <DynamicGlobalQrCard initialPayload={dynamicQr.payload} initialExpiresAt={dynamicQr.expiresAt} />

        {nearest?.rewardAvailable && nearestUsesGiftBox && (
          <GiftOpenCard
            membershipId={nearest.id}
            companyName={nearest.company.name}
            initialClaim={nearestInitialRewardClaim}
          />
        )}

        <section className={`panel p-4 ${nearest?.rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex items-start gap-3">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${nearest?.rewardAvailable ? "bg-amber-200 text-amber-900" : "bg-teal-50 text-teal-700"}`}>
              <Gift aria-hidden className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase text-slate-500">Ближайший подарок</p>
              {nearest?.company.loyaltyProgram ? (
                <>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {nearest.company.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {nearest.rewardAvailable
                      ? nearestUsesGiftBox
                        ? "Откройте подарок в карте"
                        : "Подарок доступен"
                      : `Осталось ${rewardLeft(nearest)}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {nearestLevelMembership
                    ? "Подарочных карт пока нет. Ваш статус показан ниже."
                    : "Пока нет активных карт. Найдите партнёра и начните копить плюшки."}
                </p>
              )}
            </div>
          </div>
        </section>

        {nearestLevelMembership && nearestLevelProgress?.current && (
          <section className="panel p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-2xl">
                {nearestLevelProgress.current.icon ?? "⭐"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase text-slate-500">Ваш статус</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{nearestLevelMembership.company.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {nearestLevelProgress.current.name} · покупок всего: {nearestLevelMembership.totalPurchases}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {nearestLevelProgress.next
                    ? `До ${nearestLevelProgress.next.name} осталось ${nearestLevelProgress.remainingToNext} покупок`
                    : "Вы на максимальном уровне"}
                </p>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
