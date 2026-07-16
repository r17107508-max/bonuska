import Link from "next/link";
import { ArrowRight, BadgeCheck, Gift, QrCode, ShieldCheck } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { requireUser } from "@/lib/auth";
import { getClientDashboardMemberships, pickNearestGift, rewardGoal } from "@/lib/customer-app";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
import { ensureGlobalQrToken } from "@/lib/loyalty";

export default async function ClientQrPage() {
  const currentUser = await requireUser("/company/login");
  const [dynamicQr, memberships] = await Promise.all([
    createDynamicCustomerQr(currentUser.id),
    getClientDashboardMemberships(currentUser.id),
  ]);
  const globalQrToken = await ensureGlobalQrToken(currentUser);
  const nearest = pickNearestGift(memberships);
  const goal = nearest ? rewardGoal(nearest) : 1;
  const progress = nearest ? Math.min(100, Math.round((nearest.currentCount / goal) * 100)) : 0;

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-700 text-white">
              <QrCode aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-green-800">Один тап до кассы</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2f1d13]">QR-код клиента</h1>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
                Покажите этот экран кассиру. Код подходит для всех ваших карт ProPlushka.
              </p>
            </div>
          </div>
        </section>

        <DynamicGlobalQrCard
          initialPayload={dynamicQr.payload}
          initialExpiresAt={dynamicQr.expiresAt}
          manualCodeToken={globalQrToken}
          color="#166534"
        />

        {nearest && (
          <Link href={`/app/cards/${nearest.id}`} className="warm-card block p-4 transition active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[#7b6a5b]">Ближайшая карта</p>
                <h2 className="mt-1 text-lg font-semibold text-[#2f1d13]">{nearest.company.name}</h2>
              </div>
              <ArrowRight aria-hidden className="mt-1 size-5 shrink-0 text-[#7b6a5b]" />
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100">
              <div className={`h-full rounded-full ${nearest.rewardAvailable ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#5c3521]">
              {nearest.rewardAvailable ? "Подарок готов" : `${nearest.currentCount}/${goal} до награды`}
            </p>
          </Link>
        )}

        <section className="grid gap-2">
          <QrHint icon={ShieldCheck} title="Без телефона в QR" text="Кассир видит только служебный код." />
          <QrHint icon={BadgeCheck} title="Обновляется сам" text="Динамический QR снижает риск повторного использования." />
          <QrHint icon={Gift} title="Подарки рядом" text="Когда награда готова, откройте её в разделе наград или на карточке." />
        </section>
      </section>
    </main>
  );
}

function QrHint({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white/70 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
        <Icon aria-hidden className="size-4" />
      </div>
      <div>
        <p className="font-semibold text-[#2f1d13]">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-[#7b6a5b]">{text}</p>
      </div>
    </div>
  );
}
