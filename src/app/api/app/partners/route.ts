import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/api";
import { getActivePartnerCompanies } from "@/lib/customer-app";

export async function GET(request: Request) {
  const user = await requireUser();
  const city = new URL(request.url).searchParams.get("city")?.trim() || user.city || null;
  const partners = await getActivePartnerCompanies(city, 50);

  return ok({ partners });
}
