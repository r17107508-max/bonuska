import Link from "next/link";
import { notFound } from "next/navigation";
import { loginClient, registerCustomer } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";
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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <section className="mx-auto max-w-md">
        <div className="panel overflow-hidden">
          <div className="p-6 text-white" style={{ backgroundColor: company.loyaltyProgram.themeColor }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold opacity-80">{company.businessType}</p>
                <h1 className="mt-1 text-3xl font-semibold">{company.name}</h1>
              </div>
              <span className="text-5xl">{company.loyaltyProgram.icon}</span>
            </div>
            <p className="mt-4 text-lg font-medium">{company.loyaltyProgram.rewardDescription}</p>
          </div>
          <div className="p-5">
            {!active && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
                Сервис компании временно недоступен из-за статуса подписки.
              </p>
            )}
            {query.error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{query.error}</p>}
            <div className="rounded-lg bg-slate-50 p-4 text-slate-700">
              <p className="text-xl font-semibold text-slate-950">{company.loyaltyProgram.rewardTitle}</p>
              <p className="mt-1">Нужно покупок до подарка: {company.loyaltyProgram.goalCount}</p>
            </div>

            <div className="mt-5 grid gap-5">
              <form action={registerCustomer} className="space-y-3">
                <input type="hidden" name="slug" value={company.slug} />
                <h2 className="text-xl font-semibold text-slate-950">Зарегистрироваться</h2>
                <FormField label="Имя" name="name" />
                <FormField label="Телефон" name="phone" autoComplete="tel" />
                <FormField label="Пароль" name="password" type="password" autoComplete="new-password" />
                <label className="flex gap-3 text-sm font-medium text-slate-700">
                  <input name="privacyAccepted" type="checkbox" required className="mt-1 size-4" />
                  <span>Согласен на обработку персональных данных. <Link href="/privacy" className="font-semibold text-teal-700" target="_blank">Политика</Link></span>
                </label>
                <SubmitButton>Зарегистрироваться</SubmitButton>
              </form>

              <form action={loginClient} className="space-y-3 border-t border-slate-200 pt-5">
                <input type="hidden" name="slug" value={company.slug} />
                <h2 className="text-xl font-semibold text-slate-950">Войти</h2>
                <FormField label="Телефон" name="phone" autoComplete="tel" />
                <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
                <SubmitButton variant="secondary">Войти</SubmitButton>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
