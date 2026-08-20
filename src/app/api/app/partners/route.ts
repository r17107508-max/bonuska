import { ok, requireApiUser } from "@/lib/api";
import { getActivePartnerCompanies } from "@/lib/customer-app";

export async function GET(request: Request) {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const searchParams = new URL(request.url).searchParams;
  const city = searchParams.get("city")?.trim() || user!.city || null;
  const category = searchParams.get("category")?.trim() || null;
  const partners = await getActivePartnerCompanies(city, 50, category);

  return ok({ partners });
}
