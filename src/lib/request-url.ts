import { headers } from "next/headers";

export async function getRequestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

export async function getCompanyRegistrationUrl(slug: string) {
  const origin = await getRequestOrigin();
  return `${origin}/c/${encodeURIComponent(slug)}`;
}
