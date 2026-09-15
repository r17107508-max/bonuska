import Link from "next/link";
import { CompanyStatus } from "@prisma/client";
import { Smartphone } from "lucide-react";
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
  searchParams: Promise<{ error?: string; form?: string; login?: string }>;
}) {
  const [{ companySlug }, query] = await Promise.all([params, searchParams]);
  const company = await getDb().company.findUnique({
    where: { slug: companySlug },
    include: { loyaltyProgram: true },
  });

  if (!company || company.status === CompanyStatus.DELETED || !company.loyaltyProgram) {
    notFound();
  }

  const refreshed = await refreshCompanySubscription(company.id);
  const active = refreshed ? hasActiveAccess(refreshed.status, refreshed.trialEndsAt, refreshed.paidUntil) : false;
  const currentUser = await getCurrentUser();

  if (currentUser && !query.error) {
    const membership = await getDb().customerMembership.findFirst({
      where: { userId: currentUser.id, companyId: company.id, company: { status: { not: CompanyStatus.DELETED } } },
      select: { id: true },
    });

    if (membership) {
      redirect(`/app/cards/${membership.id}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <section className="mx-auto max-w-md space-y-4">
        <header className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
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
        </header>

        {!active && (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
            Сервис компании временно недоступен из-за статуса подписки.
          </p>
        )}
        {query.error && query.form !== "login" && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{query.error}</p>}

        <section className="panel p-5">
          {currentUser ? (
            <form id="connect-program" action={joinCompanyFromPublicPage} className="scroll-mt-4 space-y-3">
              <input type="hidden" name="slug" value={company.slug} />
              <h2 className="text-xl font-semibold text-slate-950">Подключиться к программе</h2>
              {query.login && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
                  Вход выполнен. Нажмите «Подключиться», чтобы добавить карту этого магазина.
                </p>
              )}
              <p className="text-sm text-slate-600">
                Вы уже вошли как {currentUser.name}. Нажмите кнопку, и карта компании появится в общем кабинете «ПроПлюшка».
              </p>
              <SubmitButton>Подключиться</SubmitButton>
            </form>
          ) : (
            <form action={registerCustomer} className="space-y-3">
              <input type="hidden" name="slug" value={company.slug} />
              <h2 className="text-xl font-semibold text-slate-950">Получить бонусную карту</h2>
              <FormField label="Имя" name="name" autoComplete="name" />
              <FormField label="Телефон" name="phone" autoComplete="tel" />
              <FormField label="Email для восстановления пароля" name="email" type="email" autoComplete="email" placeholder="name@example.ru" />
              <p className="text-xs leading-5 text-slate-500">Если вы забудете пароль, одноразовая ссылка для его смены придёт на эту почту.</p>
              <FormField label="Город" name="city" defaultValue={company.city} autoComplete="address-level2" />
              <FormField label="Пароль" name="password" type="password" autoComplete="new-password" />
              <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Зачем нужен пароль?</summary>
                <p className="mt-2 leading-5">
                  Это основной пароль вашего аккаунта. Он понадобится, чтобы снова открыть бонусную карту после смены телефона, переустановки приложения или входа с другого устройства.
                </p>
              </details>
              <label className="flex gap-3 text-sm font-medium text-slate-700">
                <input name="privacyAccepted" type="checkbox" required className="mt-1 size-4" />
                <span>Согласен на обработку персональных данных. <Link href="/privacy" className="font-semibold text-[var(--brand)]" target="_blank">Политика</Link></span>
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
            {query.error && query.form === "login" && (
              <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
                {query.error}
              </p>
            )}
            <FormField label="Телефон" name="phone" autoComplete="tel" />
            <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
            <SubmitButton variant="secondary">Войти в карту</SubmitButton>
          </form>
        </section>
      </section>
    </main>
  );
}
