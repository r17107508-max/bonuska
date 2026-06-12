import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { CompanyStatus, CompanyUserRole } from "@prisma/client";
import { apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { normalizePhone, slugify } from "@/lib/format";
import { ensureGlobalQrToken, newGlobalQrToken } from "@/lib/loyalty";
import { getSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!name || !ownerName || phone.length < 10 || !email || password.length < 6 || !body.offerAccepted || !body.privacyAccepted) {
    return apiError("Заполните обязательные поля и примите документы");
  }

  const db = getDb();
  const settings = await getSettings();
  const user = await db.user.upsert({
    where: { phone },
    update: { name: ownerName, email, passwordHash: await bcrypt.hash(password, 10) },
    create: { name: ownerName, phone, email, passwordHash: await bcrypt.hash(password, 10), globalQrToken: newGlobalQrToken() },
  });
  await ensureGlobalQrToken(user);

  const baseSlug = slugify(String(body.slug ?? name)) || `company-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await db.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const company = await db.company.create({
    data: {
      name,
      slug,
      businessType: String(body.businessType ?? "Другое"),
      city: String(body.city ?? ""),
      address: String(body.address ?? ""),
      ownerName,
      ownerPhone: phone,
      ownerEmail: email,
      inn: body.inn ? String(body.inn) : null,
      comment: body.comment ? String(body.comment) : null,
      status: CompanyStatus.PENDING,
      users: { create: { userId: user.id, role: CompanyUserRole.COMPANY_ADMIN } },
      loyaltyProgram: { create: { icon: "🎁", rewardTitle: "Подарок", rewardDescription: "Подарок после покупок" } },
      offerAcceptances: { create: { userId: user.id, offerVersion: settings.offerVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
      personalDataConsents: { create: { userId: user.id, consentVersion: settings.privacyVersion, ip: request.headers.get("x-forwarded-for") ?? "local", userAgent: request.headers.get("user-agent") ?? "unknown" } },
      auditLogs: { create: { actorUserId: user.id, action: "COMPANY_APPLICATION_CREATED_API", entityType: "Company" } },
    },
  });

  return ok({ company }, 201);
}
