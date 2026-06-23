import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { CompanyStatus, CompanyUserRole, GlobalRole, type User } from "@prisma/client";
import { getDb } from "@/lib/db";
import { phoneLookupValues } from "@/lib/format";

const COOKIE_NAME = "tega_session";
const SESSION_DAYS = 30;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * SESSION_DAYS;
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "replace-this-local-secret-before-production",
);

type SessionPayload = {
  sub: string;
};

export type CurrentUser = Pick<User, "id" | "name" | "phone" | "email" | "city" | "globalRole">;

function sessionCookieOptions(expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires,
  };
}

export async function createSession(user: Pick<User, "id">) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) {
      return null;
    }

    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();

  if (!session) {
    return null;
  }

  return getDb().user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, phone: true, email: true, city: true, globalRole: true },
  });
}

export async function getUserHomePath(user: Pick<User, "id" | "globalRole">) {
  if (user.globalRole === GlobalRole.SUPERADMIN) {
    return "/superadmin";
  }

  const companyUser = await getDb().companyUser.findFirst({
    where: { userId: user.id, isActive: true, company: { status: { not: CompanyStatus.DELETED } } },
    orderBy: { createdAt: "asc" },
  });

  if (companyUser) {
    return "/company";
  }

  const membership = await getDb().customerMembership.findFirst({
    where: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (membership) {
    return "/app";
  }

  return "/";
}

export async function requireUser(redirectTo = "/") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireSuperadmin() {
  const user = await requireUser("/company/login");

  if (user.globalRole !== GlobalRole.SUPERADMIN) {
    redirect("/");
  }

  return user;
}

export async function requireCompanyUser(roles?: CompanyUserRole[]) {
  const user = await requireUser("/company/login");
  const companyUser = await getDb().companyUser.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      company: { status: { not: CompanyStatus.DELETED } },
      ...(roles ? { role: { in: roles } } : {}),
    },
    include: {
      company: {
        include: { loyaltyProgram: true },
      },
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!companyUser) {
    redirect(`/company/login?error=${encodeURIComponent("Нет доступа к кабинету компании")}`);
  }

  return companyUser;
}

export async function requireCompanyAdmin() {
  return requireCompanyUser([CompanyUserRole.COMPANY_ADMIN]);
}

export async function requireCustomerMembership(slug: string) {
  const user = await requireUser(`/c/${slug}`);
  const membership = await getDb().customerMembership.findFirst({
    where: {
      userId: user.id,
      company: { slug, status: { not: CompanyStatus.DELETED } },
    },
    include: {
      company: { include: { loyaltyProgram: true } },
      user: true,
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!membership) {
    redirect(`/c/${slug}?error=${encodeURIComponent("Сначала зарегистрируйтесь в этой компании")}`);
  }

  return membership;
}

export async function authenticate(phone: string, password: string) {
  const phones = phoneLookupValues(phone);
  if (phones.length === 0) {
    return null;
  }

  const user = await getDb().user.findFirst({
    where: { phone: { in: phones } },
  });

  if (!user) {
    return null;
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  return passwordOk ? user : null;
}

export function isCompanyAccessible(status: CompanyStatus, paidUntil: Date | null, trialEndsAt: Date | null) {
  if (status === CompanyStatus.BLOCKED || status === CompanyStatus.REJECTED || status === CompanyStatus.PENDING || status === CompanyStatus.DELETED) {
    return false;
  }

  const now = new Date();
  if (status === CompanyStatus.ACTIVE_PAID) {
    return Boolean(paidUntil && paidUntil > now);
  }

  if (status === CompanyStatus.ACTIVE_TRIAL) {
    return Boolean(trialEndsAt && trialEndsAt > now);
  }

  return false;
}

export function roleLabel(role: CompanyUserRole) {
  return role === CompanyUserRole.COMPANY_ADMIN ? "Админ компании" : "Кассир";
}
