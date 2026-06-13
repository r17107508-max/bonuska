import Link from "next/link";
import { Gift } from "lucide-react";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
import { getClientMemberships, pickNearestGift, rewardLeft } from "@/lib/customer-app";
import { ensureGlobalQrToken } from "@/lib/loyalty";

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
    getClientMemberships(user.id),
  ]);
  const nearest = pickNearestGift(memberships);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <header className="flex min-h-10 items-center justify-between">
          <Link href="/app" className="text-2xl font-semibold text-slate-950">
            Проплюшки
          </Link>
        </header>

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <DynamicGlobalQrCard initialPayload={dynamicQr.payload} initialExpiresAt={dynamicQr.expiresAt} />

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
                    {nearest.rewardAvailable ? "Подарок доступен" : `Осталось ${rewardLeft(nearest)}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Пока нет активных карт. Найдите партнёра и начните копить плюшки.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
