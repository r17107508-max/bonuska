import { createHash, randomBytes } from "node:crypto";
import { CompanyStatus } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hasActiveAccess } from "@/lib/loyalty";
import { phoneLookupValues } from "@/lib/format";

export function hashPosApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPosApiKey() {
  const secret = randomBytes(32).toString("base64url");
  return `ppos_live_${secret}`;
}

export function posApiKeyPrefix(key: string) {
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function findCompanyByPosApiKey(apiKey: string) {
  if (!apiKey.startsWith("ppos_live_")) {
    return null;
  }

  const company = await getDb().company.findUnique({
    where: { posApiKeyHash: hashPosApiKey(apiKey) },
    include: { users: { where: { isActive: true }, include: { user: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!company || company.status === CompanyStatus.DELETED || company.isBlocked) {
    return null;
  }

  if (!hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
    return null;
  }

  await getDb().company.update({
    where: { id: company.id },
    data: { posApiKeyLastUsedAt: new Date() },
  });

  return company;
}

export function choosePosCashier(
  company: NonNullable<Awaited<ReturnType<typeof findCompanyByPosApiKey>>>,
  cashierPhone?: string,
) {
  if (cashierPhone) {
    const phones = phoneLookupValues(cashierPhone);
    const cashier = company.users.find((item) => phones.includes(item.user.phone));
    if (cashier) return cashier.user;
  }

  return company.users.find((item) => item.role === "COMPANY_ADMIN")?.user ?? company.users[0]?.user ?? null;
}
