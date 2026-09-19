import { requireApiCompanyUser, ok } from "@/lib/api";

export async function GET() {
  const { error, access } = await requireApiCompanyUser(undefined, { allowInactive: true });
  if (error) return error;
  return ok({ access });
}
