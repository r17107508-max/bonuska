import Link from "next/link";
import { ChevronDown, ExternalLink, Globe2, MapPinned, Phone, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { getActivePartnerCompanies, getPartnerCities } from "@/lib/customer-app";
import { requireUser } from "@/lib/auth";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const [user, params, cities] = await Promise.all([
    requireUser("/company/login"),
    searchParams,
    getPartnerCities(),
  ]);
  const myCity = user.city ?? "";
  const selectedCity = params.city?.trim() || myCity || cities[0] || "";
  const partners = await getActivePartnerCompanies(selectedCity || null);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="panel p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Store aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">Партнёры</h1>
              <p className="mt-0.5 text-sm leading-5 text-slate-600">Компании рядом.</p>
            </div>
          </div>
        </section>

        <section className="panel p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Город</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{selectedCity || "Не выбран"}</p>
          <form className="mt-3 grid gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Изменить город</span>
              <input
                name="city"
                list="partner-city-options"
                defaultValue={selectedCity}
                placeholder="Введите город"
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
              />
              <datalist id="partner-city-options">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">Показать</button>
              <Link
                href={myCity ? `/app/partners?city=${encodeURIComponent(myCity)}` : "/app/account"}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Мой город
              </Link>
            </div>
          </form>
        </section>

        <section className="space-y-2.5">
          {partners.map((company) => {
            const address = [company.city, company.address].filter(Boolean).join(", ");
            const routeHref = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : "";
            const promoText = company.loyaltyProgram?.rewardDescription || `${company.loyaltyProgram?.goalCount ?? 6} покупок — подарок`;
            const website = company.website?.trim();
            const phoneHref = company.ownerPhone ? `tel:${company.ownerPhone.replace(/[^\d+]/g, "")}` : "";

            return (
              <details key={company.id} className="panel group overflow-hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    {company.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={company.logoUrl} alt="" className="size-9 shrink-0 rounded-lg border border-slate-200 bg-white object-cover" />
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-lg">
                        {company.loyaltyProgram?.icon ?? company.icon}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-base font-semibold text-slate-950">{company.name}</span>
                  </span>
                  <ChevronDown aria-hidden className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <p className="text-sm font-semibold text-slate-800">{promoText}</p>
                  {company.description && <p className="mt-1 text-sm leading-5 text-slate-600">{company.description}</p>}

                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {address && (
                      <p className="flex gap-2">
                        <MapPinned aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />
                        <span>{address}</span>
                      </p>
                    )}
                    {website && (
                      <p className="flex gap-2">
                        <Globe2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />
                        <span className="break-all">{website.replace(/^https?:\/\//i, "")}</span>
                      </p>
                    )}
                    {company.ownerPhone && (
                      <p className="flex gap-2">
                        <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />
                        <span>{company.ownerPhone}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {phoneHref ? (
                      <a href={phoneHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white">
                        <Phone aria-hidden className="size-4" />
                        Позвонить
                      </a>
                    ) : (
                      <Link href={`/c/${company.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white">
                        <ExternalLink aria-hidden className="size-4" />
                        Открыть
                      </Link>
                    )}
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <Globe2 aria-hidden className="size-4" />
                        Сайт
                      </a>
                    ) : routeHref ? (
                      <a
                        href={routeHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <MapPinned aria-hidden className="size-4" />
                        Маршрут
                      </a>
                    ) : (
                      <Link
                        href={`/c/${company.slug}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <ExternalLink aria-hidden className="size-4" />
                        Карта
                      </Link>
                    )}
                  </div>
                </div>
              </details>
            );
          })}

          {partners.length === 0 && (
            <div className="panel p-4 text-sm leading-5 text-slate-600">
              В этом городе пока нет партнёров.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
