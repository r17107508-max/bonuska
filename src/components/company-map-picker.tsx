"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, Search, Trash2 } from "lucide-react";
import type * as Leaflet from "leaflet";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GeocodeResult = Coordinates & {
  displayName: string;
};

const DEFAULT_CENTER: Leaflet.LatLngTuple = [55.751244, 37.618423];

export function CompanyMapPicker({
  city,
  address,
  initialLatitude,
  initialLongitude,
}: {
  city: string;
  address: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
}) {
  const initialCoordinates = useMemo(
    () => toCoordinates(initialLatitude, initialLongitude),
    [initialLatitude, initialLongitude],
  );
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates);
  const [query, setQuery] = useState([city, address].filter(Boolean).join(", "));
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState(initialCoordinates ? "Точка уже сохранена. При необходимости передвиньте маркер." : "Точка ещё не выбрана.");
  const [isSearching, setIsSearching] = useState(false);

  const placePoint = useCallback(async (next: Coordinates | null, moveMap = true) => {
    setCoordinates(next);
    const map = mapRef.current;
    if (!map) return;

    if (!next) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const L = await import("leaflet");
    const position: Leaflet.LatLngTuple = [next.latitude, next.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const marker = L.marker(position, {
        draggable: true,
        icon: L.divIcon({
          className: "pro-marker",
          html: mapPinHtml(),
          iconSize: [44, 52],
          iconAnchor: [22, 50],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const positionAfterDrag = marker.getLatLng();
        setCoordinates(roundCoordinates(positionAfterDrag.lat, positionAfterDrag.lng));
        setMessage("Маркер передвинут. Нажмите «Сохранить» внизу страницы.");
      });
      markerRef.current = marker;
    }

    if (moveMap) map.setView(position, 17);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current || mapRef.current) return;

      const start: Leaflet.LatLngTuple = initialCoordinates
        ? [initialCoordinates.latitude, initialCoordinates.longitude]
        : DEFAULT_CENTER;
      const map = L.map(mapElementRef.current, { zoomControl: false }).setView(start, initialCoordinates ? 16 : 4);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("click", (event) => {
        void placePoint(roundCoordinates(event.latlng.lat, event.latlng.lng), false);
        setMessage("Точка выбрана на карте. Нажмите «Сохранить» внизу страницы.");
        setResults([]);
      });
      mapRef.current = map;
      map.invalidateSize();

      if (initialCoordinates) {
        void placePoint(initialCoordinates, false);
      }
    }

    void createMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initialCoordinates, placePoint]);

  function updateQueryFromCompanyForm() {
    const form = containerRef.current?.closest("form");
    const cityInput = form?.elements.namedItem("city");
    const addressInput = form?.elements.namedItem("address");
    const currentCity = cityInput instanceof HTMLInputElement ? cityInput.value.trim() : city;
    const currentAddress = addressInput instanceof HTMLInputElement ? addressInput.value.trim() : address;
    const nextQuery = [currentCity, currentAddress].filter(Boolean).join(", ");
    setQuery(nextQuery);
    return nextQuery;
  }

  async function searchAddress() {
    const searchQuery = query.trim() || updateQueryFromCompanyForm();
    if (searchQuery.length < 3) {
      setMessage("Введите город и адрес для поиска.");
      return;
    }

    setIsSearching(true);
    setMessage("Ищем адрес...");
    setResults([]);
    try {
      const response = await fetch(`/api/company/geocode?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Accept: "application/json" },
      });
      const payload = await response.json() as { results?: GeocodeResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось выполнить поиск");

      const found = payload.results ?? [];
      setResults(found);
      if (found.length === 0) {
        setMessage("Адрес не найден. Сократите запрос или выберите точку вручную на карте.");
        return;
      }

      await selectResult(found[0]);
      setMessage(found.length === 1 ? "Адрес найден. Проверьте маркер и сохраните настройки." : "Выбран первый вариант. При необходимости выберите другой результат ниже.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить поиск адреса");
    } finally {
      setIsSearching(false);
    }
  }

  async function selectResult(result: GeocodeResult) {
    await placePoint({ latitude: result.latitude, longitude: result.longitude });
    setMessage("Точка выбрана. Нажмите «Сохранить» внизу страницы.");
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setMessage("Этот браузер не поддерживает определение местоположения.");
      return;
    }

    setMessage("Определяем текущее местоположение...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void placePoint(roundCoordinates(position.coords.latitude, position.coords.longitude));
        setResults([]);
        setMessage("Местоположение определено. Проверьте маркер и сохраните настройки.");
      },
      () => setMessage("Не удалось определить местоположение. Разрешите доступ или выберите точку на карте."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function removePoint() {
    void placePoint(null);
    setResults([]);
    setMessage("Точка удалена из формы. Нажмите «Сохранить», чтобы убрать компанию с карты.");
  }

  return (
    <div ref={containerRef} className="mt-5 space-y-4">
      <input type="hidden" name="latitude" value={coordinates?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={coordinates?.longitude ?? ""} />

      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
        <label className="block">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Найти адрес</span>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchAddress();
                }
              }}
              placeholder="Например: Москва, улица Барклая, 8"
              className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-strong)]"
            />
            <button
              type="button"
              onClick={() => void searchAddress()}
              disabled={isSearching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              <Search aria-hidden className="size-4" />
              {isSearching ? "Ищем..." : "Найти"}
            </button>
          </div>
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]"
          >
            <LocateFixed aria-hidden className="size-4" />
            Моё местоположение
          </button>
          <button
            type="button"
            onClick={() => setQuery(updateQueryFromCompanyForm())}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]"
          >
            <MapPin aria-hidden className="size-4" />
            Взять адрес из раздела «Компания»
          </button>
          {coordinates && (
            <button
              type="button"
              onClick={removePoint}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-bold text-[var(--danger)]"
            >
              <Trash2 aria-hidden className="size-4" />
              Удалить точку
            </button>
          )}
        </div>

        {results.length > 1 && (
          <div className="mt-3 space-y-2" aria-label="Найденные адреса">
            {results.map((result, index) => (
              <button
                key={`${result.latitude}-${result.longitude}-${index}`}
                type="button"
                onClick={() => void selectResult(result)}
                className="block w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)]"
              >
                {result.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        <div ref={mapElementRef} className="h-[340px] w-full md:h-[460px]" aria-label="Выбор точки компании на карте" />
        <div className="border-t border-[var(--border)] bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[var(--text)]" aria-live="polite">{message}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Нажмите на карту или перетащите маркер в точное место. После выбора обязательно нажмите общую кнопку «Сохранить» внизу страницы.
          </p>
          {coordinates && (
            <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
              Координаты: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function toCoordinates(latitude: number | null, longitude: number | null): Coordinates | null {
  if (typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180) {
    return { latitude, longitude };
  }

  return null;
}

function roundCoordinates(latitude: number, longitude: number): Coordinates {
  return {
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
  };
}

function mapPinHtml() {
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
