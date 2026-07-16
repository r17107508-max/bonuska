import Link from "next/link";
import { Filter, MapPinned, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { PartnersBrowser } from "@/components/partners-browser";
import { PartnersMap } from "@/components/partners-map";
import { getActivePartnerCompanies, getPartnerCategories, getPartnerCities } from "@/lib/customer-app";
import { requireUser } from "@/lib/auth";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const [user, params, cities] = await Promise.all([
    requireUser("/company/login"),
    searchParams,
    getPartnerCities(),
  ]);
  const myCity = user.city ?? "";
  const selectedCity = params.city?.trim() || myCity || cities[0] || "";
  const categories = await getPartnerCategories(selectedCity || null);
  const selectedCategory = categories.includes(params.category ?? "") ? params.category! : "";
  const partners = await getActivePartnerCompanies(selectedCity || null, undefined, selectedCategory || null);

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800">
              <Store aria-hidden className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-green-800">Партнёры рядом</p>
              <h1 className="mt-1 text-2xl font-bold text-[#2f1d13]">Карта точек</h1>
              <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">Выберите место, посмотрите правила и постройте маршрут.</p>
            </div>
          </div>
        </section>

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
              <MapPinned aria-hidden className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-[#7b6a5b]">Город</p>
              <p className="mt-1 truncate text-lg font-semibold text-[#2f1d13]">{selectedCity || "Не выбран"}</p>
            </div>
          </div>

          <form className="mt-3 grid gap-3">
            <input type="hidden" name="category" value={selectedCategory} />
            <label className="block">
              <span className="text-xs font-semibold uppercase text-[#7b6a5b]">Изменить город</span>
              <input
                name="city"
                list="partner-city-options"
                defaultValue={selectedCity}
                placeholder="Введите город"
                className="mt-1.5 min-h-11 w-full rounded-lg border border-amber-100 bg-white px-3 text-sm text-[#2f1d13] outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-700/15"
              />
              <datalist id="partner-city-options">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-11 rounded-lg bg-green-700 px-4 text-sm font-bold text-white">Показать</button>
              <Link
                href={myCity ? `/app/partners?city=${encodeURIComponent(myCity)}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""}` : "/app/account"}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-100 bg-white px-4 text-sm font-bold text-[#5c3521]"
              >
                Мой город
              </Link>
            </div>
          </form>
        </section>

        <section className="warm-card p-3">
          <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-[#2f1d13]">
            <Filter aria-hidden className="size-4 text-green-800" />
            Категории
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <CategoryLink active={!selectedCategory} href={`/app/partners?city=${encodeURIComponent(selectedCity)}`}>
              Все
            </CategoryLink>
            {categories.map((category) => (
              <CategoryLink
                key={category}
                active={selectedCategory === category}
                href={`/app/partners?city=${encodeURIComponent(selectedCity)}&category=${encodeURIComponent(category)}`}
              >
                {category}
              </CategoryLink>
            ))}
          </div>
        </section>

        <PartnersMap
          points={partners.map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
            city: company.city,
            address: company.address,
            latitude: company.latitude,
            longitude: company.longitude,
            ratingAverage: company.ratingAverage,
            reviewCount: company.reviewCount,
          }))}
        />

        <PartnersBrowser
          partners={partners.map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
            description: company.description,
            businessType: company.businessType,
            city: company.city,
            address: company.address,
            website: company.website,
            ownerPhone: company.ownerPhone,
            logoUrl: company.logoUrl,
            icon: company.icon,
            programIcon: company.loyaltyProgram?.icon ?? null,
            promoText: company.loyaltyProgram?.rewardDescription || `${company.loyaltyProgram?.goalCount ?? 6} покупок - подарок`,
            latitude: company.latitude,
            longitude: company.longitude,
            ratingAverage: company.ratingAverage,
            reviewCount: company.reviewCount,
          }))}
        />
      </section>
    </main>
  );
}

function CategoryLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 max-w-48 shrink-0 items-center rounded-lg px-4 text-sm font-bold ${
        active ? "bg-green-700 text-white" : "border border-amber-100 bg-white/80 text-[#5c3521]"
      }`}
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}
