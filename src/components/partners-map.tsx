"use client";

import { useEffect, useMemo, useRef } from "react";
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

export function PartnersMap({ points }: { points: PartnerMapPoint[] }) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const visiblePoints = useMemo(
    () => points.filter((point) => typeof point.latitude === "number" && typeof point.longitude === "number"),
    [points],
  );

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

      markersRef.current?.clearLayers();
      const bounds: Leaflet.LatLngTuple[] = [];

      visiblePoints.forEach((point) => {
        const position: Leaflet.LatLngTuple = [point.latitude!, point.longitude!];
        bounds.push(position);

        const marker = L.marker(position, {
          icon: L.divIcon({
            className: "pro-marker",
            html: `<span>${point.ratingAverage ? point.ratingAverage.toFixed(1) : "★"}</span>`,
            iconSize: [38, 46],
            iconAnchor: [19, 44],
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
      {visiblePoints.length === 0 && (
        <div className="border-t border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-muted)]">
          У партнёров этого города пока не указаны координаты для карты.
        </div>
      )}
    </div>
  );
}
