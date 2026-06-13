import Link from "next/link";
import { ArrowRight, MapPinned, Store } from "lucide-react";
import { getActivePartnerCompanies } from "@/lib/customer-app";

export default async function PublicPartnersPage() {
  const partners = await getActivePartnerCompanies();

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-xl font-semibold text-slate-950">Проплюшки</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/client/register" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">
              Стать клиентом
            </Link>
            <Link href="/client/login" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              Вход для клиента
            </Link>
          </div>
        </div>
      </header>

      <section className="page-shell py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-teal-700">Партнёры</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-slate-950">Где можно копить плюшки</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Активные компании, где можно использовать один QR-код Проплюшек.
          </p>
        </div>

        {partners.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {partners.map((company) => {
              const address = [company.city, company.address].filter(Boolean).join(", ");
              const routeHref = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : "";
              const promo = company.loyaltyProgram?.rewardDescription || `${company.loyaltyProgram?.goalCount ?? 6} покупок - подарок`;

              return (
                <article key={company.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold text-slate-950">
                        <span className="mr-2">{company.loyaltyProgram?.icon ?? company.icon}</span>
                        {company.name}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">{company.businessType}</p>
                    </div>
                    <Store aria-hidden className="size-5 shrink-0 text-teal-700" />
                  </div>

                  {address && <p className="mt-3 text-sm leading-6 text-slate-700">{address}</p>}
                  <p className="mt-2 text-sm font-semibold text-slate-800">{promo}</p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/c/${company.slug}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                    >
                      Открыть
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                    {routeHref ? (
                      <a
                        href={routeHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <MapPinned aria-hidden className="size-4" />
                        Маршрут
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400">
                        Нет адреса
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel mt-8 p-5 text-slate-600">
            Скоро здесь появятся первые партнёры. Пока можно зарегистрироваться и ждать подключения заведений.
          </div>
        )}
      </section>
    </main>
  );
}
