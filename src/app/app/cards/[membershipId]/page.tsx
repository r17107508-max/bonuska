import Link from "next/link";
import QRCode from "qrcode";
import { CompanyStatus, LoyaltyProgramType, RewardClaimStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { leaveCustomerMembership } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GiftOpenCard } from "@/components/gift-open-card";
import { HistoryList } from "@/components/history-list";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { ProgressIcons } from "@/components/progress-cups";
import { QrCard } from "@/components/qr-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildRewardQrPayload } from "@/lib/loyalty";

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
      company: { include: { loyaltyProgram: true } },
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

  const program = membership.company.loyaltyProgram;
  const isGiftBox = program.programType === LoyaltyProgramType.GIFT_BOX || program.isGiftBoxEnabled;
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
        qrDataUrl: await QRCode.toDataURL(buildRewardQrPayload(activeRewardClaim.token), {
          margin: 1,
          width: 360,
          color: { dark: "#92400e", light: "#ffffff" },
        }),
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-5">
      <section className="mx-auto max-w-md space-y-5">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft aria-hidden className="size-4" />
          Назад
        </Link>

        <header className="rounded-2xl p-5 text-white shadow-sm" style={{ backgroundColor: program.themeColor }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold opacity-80">{membership.company.businessType}</p>
              <h1 className="mt-1 text-3xl font-semibold">{membership.company.name}</h1>
              <p className="mt-2 text-sm opacity-85">Карта клиента: {membership.user.name}</p>
            </div>
            <span className="text-5xl">{program.icon}</span>
          </div>
        </header>

        <QrCard token={membership.qrToken} color={program.themeColor} companyName={membership.company.name} />

        {membership.rewardAvailable && isGiftBox && (
          <GiftOpenCard
            membershipId={membership.id}
            companyName={membership.company.name}
            initialClaim={initialRewardClaim}
          />
        )}

        <ProgressIcons
          icon={program.icon}
          current={membership.currentCount}
          goal={program.goalCount}
          rewardAvailable={membership.rewardAvailable}
          rewardTitle={membership.pendingReward ?? program.rewardTitle}
          rewardReadyHint={
            membership.rewardAvailable && isGiftBox
              ? initialRewardClaim
                ? "Покажите QR подарка кассиру, чтобы получить подарок."
                : "Откройте коробку, узнайте подарок и покажите отдельный QR кассиру."
              : undefined
          }
        />

        <InstallPwaButton />

        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">История покупок</h2>
          <HistoryList transactions={membership.transactions} emptyText="Покупок пока нет" />
        </section>

        <form action={leaveCustomerMembership} className="panel p-5">
          <input type="hidden" name="membershipId" value={membership.id} />
          <h2 className="text-xl font-semibold text-slate-950">Участие в программе</h2>
          <p className="mt-2 text-sm text-slate-600">
            Можно выйти из программы этой компании. Остальные бонусные карты и аккаунт «ПроПлюшка» останутся.
          </p>
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
