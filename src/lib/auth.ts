import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { CompanyStatus, CompanyUserRole, GlobalRole, type User } from "@prisma/client";
import { getDb } from "@/lib/db";

const COOKIE_NAME = "tega_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "replace-this-local-secret-before-production",
);

type SessionPayload = {
  sub: string;
};

export type CurrentUser = Pick<User, "id" | "name" | "phone" | "email" | "globalRole">;

export async function createSession(user: Pick<User, "id">) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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
    select: { id: true, name: true, phone: true, email: true, globalRole: true },
  });
}

export async function requireUser(redirectTo = "/") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireSuperadmin() {
  const user = await requireUser("/superadmin/login");

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
    redirect("/company/login?error=Нет доступа к кабинету компании");
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
      company: { slug },
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
    redirect(`/c/${slug}?error=Сначала зарегистрируйтесь в этой компании`);
  }

  return membership;
}

export async function authenticate(phone: string, password: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const user = await getDb().user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!user) {
    return null;
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  return passwordOk ? user : null;
}

export function isCompanyAccessible(status: CompanyStatus, paidUntil: Date | null, trialEndsAt: Date | null) {
  if (status === CompanyStatus.BLOCKED || status === CompanyStatus.REJECTED || status === CompanyStatus.PENDING) {
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
