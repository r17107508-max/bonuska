import { CompanyUserRole } from "@prisma/client";
import { apiError, ok, requireApiCompanyUser } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const cache = new Map<string, { expiresAt: number; results: GeocodeResult[] }>();
let lastExternalRequestAt = 0;

export async function GET(request: Request) {
  const { error } = await requireApiCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
  if (error) return error;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 240) {
    return apiError("Введите адрес длиной от 3 до 240 символов");
  }

  const cacheKey = query.toLocaleLowerCase("ru-RU");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return ok({ results: cached.results });
  }

  if (Date.now() - lastExternalRequestAt < 1100) {
    return apiError("Подождите секунду и повторите поиск адреса", 429);
  }
  lastExternalRequestAt = Date.now();

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    countrycodes: "ru",
    "accept-language": "ru",
    q: query,
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": "ru",
        Referer: "https://proplushka.ru/",
        "User-Agent": "ProPlushka/1.0 (+https://proplushka.ru)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return apiError("Сервис поиска адреса временно недоступен. Выберите точку вручную на карте", 502);
    }

    const rawResults = await response.json() as NominatimResult[];
    const results = rawResults
      .map((result): GeocodeResult | null => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        if (!validCoordinates(latitude, longitude)) return null;
        return {
          latitude,
          longitude,
          displayName: result.display_name?.trim() || `${latitude}, ${longitude}`,
        };
      })
      .filter((result): result is GeocodeResult => Boolean(result));

    if (cache.size >= 500) cache.delete(cache.keys().next().value ?? "");
    cache.set(cacheKey, { expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, results });
    return ok({ results });
  } catch {
    return apiError("Не удалось связаться с сервисом поиска. Выберите точку вручную на карте", 502);
  }
}

function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}
