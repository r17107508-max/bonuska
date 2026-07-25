"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

export type PartnerMapPoint = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  ratingAverage: number | null;
  reviewCount: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type VisiblePartnerMapPoint = PartnerMapPoint & Coordinates;

const GEOCODE_CACHE_PREFIX = "partner-map-geocode";
const GEOCODE_CACHE_VERSION = "v1";

export function PartnersMap({ points }: { points: PartnerMapPoint[] }) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, Coordinates>>({});
  const [isResolvingCoordinates, setIsResolvingCoordinates] = useState(false);

  const visiblePoints = useMemo(
    () =>
      points
        .map((point): VisiblePartnerMapPoint | null => {
          if (hasCoordinates(point)) {
            return { ...point, latitude: point.latitude, longitude: point.longitude };
          }

          const resolved = resolvedCoordinates[point.id];
          return resolved ? { ...point, ...resolved } : null;
        })
        .filter((point): point is VisiblePartnerMapPoint => Boolean(point)),
    [points, resolvedCoordinates],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function resolveMissingCoordinates() {
      const missingPoints = points.filter((point) => !hasCoordinates(point) && !resolvedCoordinates[point.id]);
      if (missingPoints.length === 0) {
        setIsResolvingCoordinates(false);
        return;
      }

      setIsResolvingCoordinates(true);
      const resolved: Record<string, Coordinates> = {};

      for (const point of missingPoints) {
        const cached = readCachedCoordinates(point);
        const coordinates = cached ?? await geocodePoint(point, controller.signal);

        if (coordinates) {
          resolved[point.id] = coordinates;
          writeCachedCoordinates(point, coordinates);
        }
      }

      if (!cancelled) {
        if (Object.keys(resolved).length > 0) {
          setResolvedCoordinates((current) => ({ ...current, ...resolved }));
        }
        setIsResolvingCoordinates(false);
      }
    }

    void resolveMissingCoordinates();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [points, resolvedCoordinates]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current) return;

      if (!mapRef.current) {
        const firstPoint = visiblePoints[0];
        mapRef.current = L.map(mapElementRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(firstPoint ? [firstPoint.latitude!, firstPoint.longitude!] : [55.751244, 37.618423], firstPoint ? 12 : 4);

        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapRef.current);
        markersRef.current = L.layerGroup().addTo(mapRef.current);
      }

      mapRef.current.invalidateSize();
      markersRef.current?.clearLayers();
      const bounds: Leaflet.LatLngTuple[] = [];

      visiblePoints.forEach((point) => {
        const position: Leaflet.LatLngTuple = [point.latitude!, point.longitude!];
        bounds.push(position);

        const marker = L.marker(position, {
          icon: L.divIcon({
            className: "pro-marker",
            html: storeMarkerHtml(),
            iconSize: [44, 52],
            iconAnchor: [22, 50],
            popupAnchor: [0, -38],
          }),
          title: point.name,
        });

        const popup = document.createElement("div");
        popup.className = "pro-marker-popup";

        const title = document.createElement("strong");
        title.textContent = point.name;
        popup.appendChild(title);

        const address = document.createElement("p");
        address.textContent = [point.city, point.address].filter(Boolean).join(", ");
        popup.appendChild(address);

        const rating = document.createElement("p");
        rating.textContent = point.reviewCount > 0
          ? `Рейтинг ${point.ratingAverage?.toFixed(1)} из 5, отзывов: ${point.reviewCount}`
          : "Пока нет отзывов";
        popup.appendChild(rating);

        const link = document.createElement("a");
        link.href = `/app/companies/${point.slug}`;
        link.textContent = "Открыть карточку";
        popup.appendChild(link);

        marker.bindPopup(popup);
        marker.addTo(markersRef.current!);
      });

      if (bounds.length > 1) {
        mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
      } else if (bounds.length === 1) {
        mapRef.current.setView(bounds[0], 14);
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [visiblePoints]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
      <div ref={mapElementRef} className="h-[360px] w-full" aria-label="Карта точек ПроПлюшка" />
      {visiblePoints.length === 0 && isResolvingCoordinates && (
        <div className="border-t border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-muted)]">
          Определяем координаты точек по адресам...
        </div>
      )}
      {visiblePoints.length === 0 && !isResolvingCoordinates && (
        <div className="border-t border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-muted)]">
          У партнёров этого города пока не указаны координаты для карты.
        </div>
      )}
    </div>
  );
}

function hasCoordinates(point: PartnerMapPoint): point is PartnerMapPoint & Coordinates {
  return typeof point.latitude === "number" && typeof point.longitude === "number";
}

function coordinateCacheKey(point: PartnerMapPoint) {
  return `${GEOCODE_CACHE_PREFIX}:${GEOCODE_CACHE_VERSION}:${point.id}:${point.city}:${point.address}`;
}

function readCachedCoordinates(point: PartnerMapPoint): Coordinates | null {
  try {
    const raw = window.localStorage.getItem(coordinateCacheKey(point));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Coordinates>;

    if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedCoordinates(point: PartnerMapPoint, coordinates: Coordinates) {
  try {
    window.localStorage.setItem(coordinateCacheKey(point), JSON.stringify(coordinates));
  } catch {
    // Map markers can still render for the current session without cache.
  }
}

async function geocodePoint(point: PartnerMapPoint, signal: AbortSignal): Promise<Coordinates | null> {
  const query = [point.city, point.address || point.name].filter(Boolean).join(", ");
  if (!query) return null;

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      q: query,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) return null;

    const [result] = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  } catch {
    return null;
  }

  return null;
}

function storeMarkerHtml() {
  return `
    <span class="pro-marker-pin" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M4 10.5V20h16v-9.5" />
        <path d="M4.5 4h15l1.2 5.1a2.6 2.6 0 0 1-4.9 1.2 2.6 2.6 0 0 1-4.8 0 2.6 2.6 0 0 1-4.8 0 2.6 2.6 0 0 1-4.9-1.2L4.5 4Z" />
        <path d="M9 20v-5.5h6V20" />
      </svg>
    </span>
  `;
}
