import { CompanyUserRole } from "@prisma/client";
import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { phoneLookupValues } from "@/lib/format";

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} *** ** ${digits.slice(-2)}`;
}

export async function GET(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return apiError("Введите минимум 2 символа", 400);
  }

  const phoneValues = phoneLookupValues(q);
  const digits = q.replace(/\D/g, "");
  const matches = await getDb().customerMembership.findMany({
    where: {
      companyId: access!.companyId,
      user: {
        OR: [
          { name: { contains: q } },
          ...(phoneValues.length ? [{ phone: { in: phoneValues } }] : []),
          { phone: { contains: digits || q } },
        ],
      },
    },
    include: {
      user: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const canSeePhone = access!.role === CompanyUserRole.COMPANY_ADMIN;

  return ok({
    clients: matches.map((item) => ({
      id: item.id,
      name: item.user.name,
      phone: canSeePhone ? item.user.phone : maskPhone(item.user.phone),
      scanToken: `tega:${item.qrToken}`,
      scanHref: `/company/scan?token=${encodeURIComponent(`tega:${item.qrToken}`)}`,
    })),
  });
}
