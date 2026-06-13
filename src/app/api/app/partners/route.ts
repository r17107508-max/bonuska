import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/api";
import { getActivePartnerCompanies } from "@/lib/customer-app";

export async function GET() {
  await requireUser();
  const partners = await getActivePartnerCompanies();

  return ok({ partners });
}
