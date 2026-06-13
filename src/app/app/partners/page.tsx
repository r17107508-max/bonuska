import Link from "next/link";
import { ExternalLink, MapPinned, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { getActivePartnerCompanies } from "@/lib/customer-app";
import { requireUser } from "@/lib/auth";

export default async function PartnersPage() {
  await requireUser("/company/login");
  const partners = await getActivePartnerCompanies();

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        <section className="panel p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Store aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Партнёры</h1>
              <p className="mt-1 text-sm leading-5 text-slate-600">Где работает один QR-код сервиса «ПроПлюшка».</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {partners.map((company) => {
            const address = [company.city, company.address].filter(Boolean).join(", ");
            const routeHref = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : "";

            return (
              <article key={company.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-slate-950">
                      <span className="mr-2">{company.loyaltyProgram?.icon ?? company.icon}</span>
                      {company.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{company.businessType}</p>
                  </div>
                </div>

                {address && <p className="mt-3 text-sm leading-5 text-slate-700">{address}</p>}
                {company.loyaltyProgram && (
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    Акция: {company.loyaltyProgram.rewardDescription || `${company.loyaltyProgram.goalCount} покупок — подарок`}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/c/${company.slug}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                    Открыть
                  </Link>
                  {routeHref ? (
                    <a
                      href={routeHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                    >
                      <MapPinned aria-hidden className="size-4" />
                      Маршрут
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-400">
                      Нет адреса
                    </span>
                  )}
                </div>
              </article>
            );
          })}

          {partners.length === 0 && (
            <div className="panel p-5 text-sm leading-6 text-slate-600">
              Активных партнёров пока нет. Когда компании подключатся, они появятся здесь.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
