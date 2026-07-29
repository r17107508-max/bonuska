"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Globe2, LocateFixed, MapPinned, Navigation, Phone, Star } from "lucide-react";

export type PartnerBrowserItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  businessType: string;
  city: string;
  address: string;
  website: string | null;
  ownerPhone: string | null;
  logoUrl: string | null;
  icon: string;
  programIcon: string | null;
  promoText: string;
  latitude: number | null;
  longitude: number | null;
  ratingAverage: number | null;
  reviewCount: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

export function PartnersBrowser({ partners }: { partners: PartnerBrowserItem[] }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const sortedPartners = useMemo(() => {
    const withDistance = partners.map((partner) => ({
      ...partner,
      distanceKm: userLocation && typeof partner.latitude === "number" && typeof partner.longitude === "number"
        ? distanceKm(userLocation, { latitude: partner.latitude, longitude: partner.longitude })
        : null,
    }));

    if (!userLocation) return withDistance;

    return withDistance.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name, "ru");
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [partners, userLocation]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoStatus("ready");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10_000 },
    );
  }

  return (
    <section className="space-y-2.5">
      {partners.length > 0 && (
        <div>
          <button
            type="button"
            onClick={requestLocation}
            disabled={geoStatus === "loading"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white disabled:opacity-60"
          >
            <LocateFixed aria-hidden className={`size-4 ${geoStatus === "loading" ? "animate-spin" : ""}`} />
            {geoStatus === "ready" ? "Показаны ближайшие" : geoStatus === "loading" ? "Определяем..." : "Рядом со мной"}
          </button>
          {geoStatus === "error" && (
            <p className="mt-2 text-sm font-semibold text-[var(--danger)]">
              Не удалось получить геопозицию. Проверьте разрешение браузера.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {sortedPartners.map((company) => {
          const address = [company.city, company.address].filter(Boolean).join(", ");
          const routeHref = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : "";
          const phoneHref = company.ownerPhone ? `tel:${company.ownerPhone.replace(/[^\d+]/g, "")}` : "";

          return (
            <article key={company.id} className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
              <Link href={`/app/companies/${company.slug}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  {company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logoUrl} alt={`Логотип ${company.name}`} className="size-11 shrink-0 rounded-2xl border border-[var(--border)] bg-white object-cover" />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-lg">
                      {company.programIcon ?? company.icon}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-base font-extrabold text-[var(--text)]">{company.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-[var(--text-muted)]">
                      <span>{company.businessType}</span>
                      {company.reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#7a4b00]">
                          <Star aria-hidden className="size-3.5 fill-current" />
                          {company.ratingAverage?.toFixed(1)} · {company.reviewCount}
                        </span>
                      )}
                      {company.distanceKm !== null && (
                        <span className="inline-flex items-center gap-1 text-[var(--brand-strong)]">
                          <Navigation aria-hidden className="size-3.5" />
                          {formatDistance(company.distanceKm)}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
                <ExternalLink aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
              </Link>

              <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                <p className="text-sm font-bold text-[var(--text)]">{company.promoText}</p>
                {company.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">{company.description}</p>}

                {address && (
                  <p className="mt-3 flex gap-2 text-sm text-[var(--text-muted)]">
                    <MapPinned aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-strong)]" />
                    <span>{address}</span>
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link href={`/app/companies/${company.slug}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl bg-[var(--brand-strong)] px-2 text-sm font-bold text-white">
                    <ExternalLink aria-hidden className="size-4" />
                    Открыть
                  </Link>
                  {routeHref && (
                    <a href={routeHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-white px-2 text-sm font-bold text-[var(--text)]">
                      <MapPinned aria-hidden className="size-4" />
                      Маршрут
                    </a>
                  )}
                  {phoneHref && (
                    <a href={phoneHref} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-white px-2 text-sm font-bold text-[var(--text)]">
                      <Phone aria-hidden className="size-4" />
                      Позвонить
                    </a>
                  )}
                  {!routeHref && !phoneHref && company.website && (
                    <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-white px-2 text-sm font-bold text-[var(--text)]">
                      <Globe2 aria-hidden className="size-4" />
                      Сайт
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {partners.length === 0 && (
        <div className="rounded-3xl border border-[var(--border)] bg-white p-4 text-sm leading-5 text-[var(--text-muted)]">
          В этом городе и категории пока нет партнёров.
        </div>
      )}
    </section>
  );
}

function distanceKm(from: UserLocation, to: UserLocation) {
  const earthRadiusKm = 6371;
  const latDelta = degToRad(to.latitude - from.latitude);
  const lonDelta = degToRad(to.longitude - from.longitude);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(degToRad(from.latitude)) *
      Math.cos(degToRad(to.latitude)) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function degToRad(value: number) {
  return value * (Math.PI / 180);
}

function formatDistance(value: number) {
  if (value < 1) {
    return `${Math.max(50, Math.round(value * 1000 / 50) * 50)} м`;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} км`;
}
