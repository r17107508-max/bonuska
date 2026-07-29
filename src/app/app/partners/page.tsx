import Link from "next/link";
import { Filter, LocateFixed, MapPinned, Search, Store } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientCard, ClientShell } from "@/components/client-ui";
import { PartnersBrowser } from "@/components/partners-browser";
import { PartnersMap } from "@/components/partners-map";
import { getActivePartnerCompanies, getPartnerCategories, getPartnerCities } from "@/lib/customer-app";
import { requireUser } from "@/lib/auth";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string; view?: string; q?: string }>;
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
  const view = params.view === "list" ? "list" : "map";
  const query = params.q?.trim().toLowerCase() ?? "";
  const partners = (await getActivePartnerCompanies(selectedCity || null, undefined, selectedCategory || null)).filter((company) => {
    if (!query) return true;
    return `${company.name} ${company.businessType} ${company.address}`.toLowerCase().includes(query);
  });
  const baseQuery = `city=${encodeURIComponent(selectedCity)}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <ClientShell className="lg:pb-16">
      <ClientBrandHeader greeting="Партнёры" />

      <section>
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">Карта партнёров</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Найдите место, где можно копить покупки и получать подарки.</p>
      </section>

      <ClientCard className="space-y-3">
        <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" role="search">
          <input type="hidden" name="category" value={selectedCategory} />
          <input type="hidden" name="city" value={selectedCity} />
          <label className="relative block">
            <span className="sr-only">Поиск партнёра</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Поиск по названию или адресу"
              className="min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white py-2 pl-10 pr-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
            />
          </label>
          <label className="block">
            <span className="sr-only">Город</span>
            <input
              name="city"
              list="partner-city-options"
              defaultValue={selectedCity}
              placeholder="Город"
              className="min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)] md:w-44"
            />
            <datalist id="partner-city-options">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white">
            <Filter aria-hidden className="size-4" />
            Найти
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={myCity ? `/app/partners?city=${encodeURIComponent(myCity)}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""}` : "/app/account"}
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]"
          >
            <LocateFixed aria-hidden className="size-4" />
            Рядом со мной
          </Link>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--brand-soft)] px-3 text-sm font-bold text-[var(--brand-strong)]">
            <MapPinned aria-hidden className="size-4" />
            {selectedCity || "Город не выбран"}
          </span>
        </div>
      </ClientCard>

      <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Категории">
        <CategoryLink active={!selectedCategory} href={`/app/partners?city=${encodeURIComponent(selectedCity)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>Все</CategoryLink>
        {categories.map((category) => (
          <CategoryLink
            key={category}
            active={selectedCategory === category}
            href={`/app/partners?city=${encodeURIComponent(selectedCity)}&category=${encodeURIComponent(category)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          >
            {category}
          </CategoryLink>
        ))}
      </section>

      <section className="flex gap-2" aria-label="Вид партнёров">
        <ViewLink active={view === "map"} href={`/app/partners?${baseQuery}&view=map`}>Карта</ViewLink>
        <ViewLink active={view === "list"} href={`/app/partners?${baseQuery}&view=list`}>Список</ViewLink>
      </section>

      {view === "map" && (
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
      )}

      <section className={view === "map" ? "rounded-t-[28px] border border-[var(--border)] bg-white p-3 shadow-sm md:p-4" : ""}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--text)]">{view === "map" ? "Список рядом" : "Партнёры"}</h2>
          <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[var(--inactive)] px-3 text-xs font-bold text-[var(--text-muted)]">
            <Store aria-hidden className="size-4" />
            {partners.length}
          </span>
        </div>
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
    </ClientShell>
  );
}

function CategoryLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 max-w-48 shrink-0 items-center rounded-2xl px-4 text-sm font-extrabold ${
        active ? "bg-[var(--brand-strong)] text-white" : "border border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}

function ViewLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-extrabold sm:flex-none ${
        active ? "bg-[var(--text)] text-white" : "border border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      {children}
    </Link>
  );
}
