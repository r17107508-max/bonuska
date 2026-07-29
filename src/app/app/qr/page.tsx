import Link from "next/link";
import { ArrowLeft, Gift, QrCode } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientCard, ClientShell, ProgressBar, pluralPurchasesLeft } from "@/components/client-ui";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { requireUser } from "@/lib/auth";
import { getClientMemberships, pickNearestGift, rewardGoal, rewardLeft } from "@/lib/customer-app";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";

export default async function ClientQrPage() {
  const currentUser = await requireUser("/company/login");
  const [dynamicQr, memberships] = await Promise.all([
    createDynamicCustomerQr(currentUser.id),
    getClientMemberships(currentUser.id),
  ]);
  const nearest = pickNearestGift(memberships);
  const goal = nearest ? rewardGoal(nearest) : 1;
  const progress = nearest ? Math.min(100, Math.round((nearest.currentCount / goal) * 100)) : 0;

  return (
    <ClientShell className="bg-white">
      <ClientBrandHeader greeting="Мой QR" />

      <section className="flex items-center justify-between gap-3">
        <Link href="/app" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-extrabold text-[var(--text)]">
          <ArrowLeft aria-hidden className="size-4" />
          Закрыть
        </Link>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 text-xs font-extrabold text-[var(--brand-strong)]">
          <QrCode aria-hidden className="size-4" />
          Покажите кассиру
        </span>
      </section>

      <section className="text-center">
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">Мой QR</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Один динамический код для всех партнёров.</p>
      </section>

      <DynamicGlobalQrCard
        initialPayload={dynamicQr.payload}
        initialExpiresAt={dynamicQr.expiresAt}
        color="#1F1B18"
      />

      {nearest && (
        <ClientCard>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
              <Gift aria-hidden className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-[var(--text)]">{nearest.company.name}</p>
              <p className="mt-1 text-sm font-bold text-[var(--text)]">
                {nearest.rewardAvailable ? "Подарок готов" : pluralPurchasesLeft(rewardLeft(nearest))}
              </p>
              <div className="mt-3">
                <ProgressBar value={progress} tone={nearest.rewardAvailable ? "warning" : "brand"} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{nearest.currentCount} из {goal}</p>
            </div>
          </div>
        </ClientCard>
      )}
    </ClientShell>
  );
}
