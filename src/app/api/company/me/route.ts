import { requireApiCompanyUser, ok } from "@/lib/api";

export async function GET() {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  return ok({ access });
}
