import Link from "next/link";
import { Gift, QrCode, ScanLine, Smartphone } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { joinCompanyFromPublicPage, loginClient, registerCustomer } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasActiveAccess, refreshCompanySubscription } from "@/lib/loyalty";

export default async function PublicCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ companySlug }, query] = await Promise.all([params, searchParams]);
  const company = await getDb().company.findUnique({
    where: { slug: companySlug },
    include: { loyaltyProgram: true },
  });

  if (!company || !company.loyaltyProgram) {
    notFound();
  }

  const refreshed = await refreshCompanySubscription(company.id);
  const active = refreshed ? hasActiveAccess(refreshed.status, refreshed.trialEndsAt, refreshed.paidUntil) : false;
  const currentUser = await getCurrentUser();

  if (currentUser && !query.error) {
    const membership = await getDb().customerMembership.findFirst({
      where: { userId: currentUser.id, companyId: company.id },
      select: { id: true },
    });

    if (membership) {
      redirect(`/app/cards/${membership.id}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <section className="mx-auto max-w-md space-y-4">
        <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="p-6 text-white" style={{ backgroundColor: company.loyaltyProgram.themeColor }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold opacity-80">{company.businessType}</p>
                <h1 className="mt-1 text-3xl font-semibold">{company.name}</h1>
                <p className="mt-4 text-lg font-medium">{company.loyaltyProgram.rewardDescription}</p>
              </div>
              <span className="text-5xl">{company.loyaltyProgram.icon}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4 text-center text-xs font-semibold text-slate-600">
            <MiniStep icon={<QrCode aria-hidden className="size-5" />} text="Получите QR" />
            <MiniStep icon={<ScanLine aria-hidden className="size-5" />} text="Покажите кассиру" />
            <MiniStep icon={<Gift aria-hidden className="size-5" />} text="Заберите подарок" />
          </div>
        </header>

        {!active && (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
            Сервис компании временно недоступен из-за статуса подписки.
          </p>
        )}
        {query.error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{query.error}</p>}

        <section className="panel p-5">
          <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
            <p className="flex items-center gap-2 text-xl font-semibold text-slate-950">
              <Gift aria-hidden className="size-5 text-teal-700" />
              {company.loyaltyProgram.rewardTitle}
            </p>
            <p className="mt-2">Нужно покупок до подарка: <span className="font-semibold text-slate-950">{company.loyaltyProgram.goalCount}</span></p>
            <p className="mt-1 text-sm text-slate-500">Регистрация займёт меньше минуты. После неё вы сразу получите личный QR-код.</p>
          </div>

          {currentUser ? (
            <form action={joinCompanyFromPublicPage} className="mt-5 space-y-3">
              <input type="hidden" name="slug" value={company.slug} />
              <h2 className="text-xl font-semibold text-slate-950">Подключиться к программе</h2>
              <p className="text-sm text-slate-600">
                Вы уже вошли как {currentUser.name}. Нажмите кнопку, и карта компании появится в общем кабинете Проплюшек.
              </p>
              <SubmitButton>Подключиться</SubmitButton>
            </form>
          ) : (
            <form action={registerCustomer} className="mt-5 space-y-3">
              <input type="hidden" name="slug" value={company.slug} />
              <h2 className="text-xl font-semibold text-slate-950">Получить бонусную карту</h2>
              <FormField label="Имя" name="name" autoComplete="name" />
              <FormField label="Телефон" name="phone" autoComplete="tel" />
              <FormField label="Пароль для входа на другом телефоне" name="password" type="password" autoComplete="new-password" />
              <label className="flex gap-3 text-sm font-medium text-slate-700">
                <input name="privacyAccepted" type="checkbox" required className="mt-1 size-4" />
                <span>Согласен на обработку персональных данных. <Link href="/privacy" className="font-semibold text-teal-700" target="_blank">Политика</Link></span>
              </label>
              <SubmitButton>Получить QR-код</SubmitButton>
            </form>
          )}
        </section>

        <section className="panel p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Smartphone aria-hidden className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-950">Уже есть карта?</h2>
              <p className="mt-1 text-sm text-slate-600">Войдите по телефону и паролю, чтобы открыть QR-код и прогресс.</p>
            </div>
          </div>
          <form action={loginClient} className="mt-4 space-y-3">
            <input type="hidden" name="slug" value={company.slug} />
            <FormField label="Телефон" name="phone" autoComplete="tel" />
            <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
            <SubmitButton variant="secondary">Войти в карту</SubmitButton>
          </form>
        </section>
      </section>
    </main>
  );
}

function MiniStep({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">{icon}</div>
      <p className="mt-2">{text}</p>
    </div>
  );
}
