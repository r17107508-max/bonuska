import Link from "next/link";
import { Gift, History, Search, Settings, WalletCards } from "lucide-react";
import { deleteCustomerAccount, logout } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DynamicGlobalQrCard } from "@/components/dynamic-global-qr-card";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";
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
  const dynamicQr = await createDynamicCustomerQr(user.id);
  const memberships = await getDb().customerMembership.findMany({
    where: { userId: user.id },
    include: {
      company: { include: { loyaltyProgram: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const nearest = [...memberships]
    .filter((membership) => membership.company.loyaltyProgram)
    .sort((a, b) => {
      if (a.rewardAvailable && !b.rewardAvailable) return -1;
      if (!a.rewardAvailable && b.rewardAvailable) return 1;
      const aGoal = a.company.loyaltyProgram?.goalCount ?? 1;
      const bGoal = b.company.loyaltyProgram?.goalCount ?? 1;
      return b.currentCount / bGoal - a.currentCount / aGoal;
    })[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <section className="mx-auto max-w-md space-y-5">
        <header className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm font-semibold text-white/70">Проплюшки</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Мои бонусы</h1>
              <p className="mt-2 text-sm text-white/75">{user.name}, один аккаунт для всех бонусных карт.</p>
            </div>
            <WalletCards aria-hidden className="size-10 text-teal-300" />
          </div>
        </header>

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <DynamicGlobalQrCard initialPayload={dynamicQr.payload} initialExpiresAt={dynamicQr.expiresAt} />

        <section className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Gift aria-hidden className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">Ближайший подарок</p>
              {nearest?.company.loyaltyProgram ? (
                <p className="mt-1 font-semibold text-slate-950">
                  {nearest.rewardAvailable
                    ? `${nearest.company.name}: подарок доступен`
                    : `${nearest.company.name}: осталось ${Math.max(nearest.company.loyaltyProgram.goalCount - nearest.currentCount, 0)}`}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Подключитесь к первой компании по QR-плакату на кассе.</p>
              )}
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Мои карты</h2>
              <p className="mt-1 text-sm text-slate-600">Отдельный прогресс по каждой компании.</p>
            </div>
            <Link href="/app/cards" className="text-sm font-semibold text-teal-700">Все</Link>
          </div>
          <div className="mt-4 space-y-3">
            {memberships.slice(0, 6).map((membership) => (
              <MembershipCard key={membership.id} membership={membership} />
            ))}
            {memberships.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Карт пока нет. Отсканируйте QR-плакат компании, чтобы подключиться к программе.
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/cards" className="panel flex min-h-20 flex-col justify-center p-4 font-semibold text-slate-950">
            <Search aria-hidden className="mb-2 size-5 text-teal-700" />
            Найти карту
          </Link>
          <Link href="/app/history" className="panel flex min-h-20 flex-col justify-center p-4 font-semibold text-slate-950">
            <History aria-hidden className="mb-2 size-5 text-teal-700" />
            История
          </Link>
        </div>

        <InstallPwaButton />

        <section className="panel p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Settings aria-hidden className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-slate-950">Аккаунт</h2>
              <p className="mt-1 text-sm text-slate-600">Можно выйти из приложения или полностью удалить клиентский аккаунт.</p>
            </div>
          </div>
          <form action={logout} className="mt-4">
            <button type="submit" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700">Выйти</button>
          </form>
          <form action={deleteCustomerAccount} className="mt-3">
            <ConfirmSubmit
              danger
              title="Удалить аккаунт?"
              confirmText="Будут удалены клиентский аккаунт, бонусные карты и история участия в программах. Если аккаунт привязан к компании, удаление будет остановлено."
              buttonText="Удалить аккаунт"
            />
          </form>
        </section>
      </section>
    </main>
  );
}

type ClientMembershipCard = {
  id: string;
  currentCount: number;
  rewardAvailable: boolean;
  pendingReward: string | null;
  company: {
    name: string;
    businessType: string;
    loyaltyProgram: {
      icon: string;
      goalCount: number;
      rewardTitle: string;
    } | null;
  };
};

function MembershipCard({ membership }: { membership: ClientMembershipCard }) {
  const program = membership.company.loyaltyProgram;
  const goal = program?.goalCount ?? 1;
  const left = Math.max(goal - membership.currentCount, 0);

  return (
    <Link href={`/app/cards/${membership.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            <span className="mr-2">{program?.icon ?? "🎁"}</span>
            {membership.company.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{membership.company.businessType}</p>
        </div>
        <span className="text-sm font-semibold text-teal-700">Открыть</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {membership.rewardAvailable
          ? `Подарок доступен: ${membership.pendingReward ?? program?.rewardTitle ?? "Подарок"}`
          : `${membership.currentCount} из ${goal}. Осталось ${left}`}
      </p>
    </Link>
  );
}
