import { Prisma, type PrismaClient, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  PHONE_ALREADY_REGISTERED_MESSAGE,
  normalizeEmail,
  normalizePhone,
  phoneLookupValues,
} from "@/lib/format";
import { newGlobalQrToken } from "@/lib/loyalty";

type DbClient = PrismaClient;

export class PhoneAlreadyRegisteredError extends Error {
  constructor() {
    super(PHONE_ALREADY_REGISTERED_MESSAGE);
    this.name = "PhoneAlreadyRegisteredError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super(EMAIL_ALREADY_REGISTERED_MESSAGE);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export function isPhoneAlreadyRegisteredError(error: unknown) {
  return error instanceof PhoneAlreadyRegisteredError;
}

export function isEmailAlreadyRegisteredError(error: unknown) {
  return error instanceof EmailAlreadyRegisteredError;
}

export async function findUserByPhone(phone: FormDataEntryValue | string | null, db: DbClient = getDb()) {
  const phones = phoneLookupValues(phone);

  if (phones.length === 0) {
    return null;
  }

  return db.user.findFirst({
    where: { phone: { in: phones } },
  });
}

export async function findUsersByEmail(email: FormDataEntryValue | string | null, db: DbClient = getDb()) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  return db.$queryRaw<User[]>(
    Prisma.sql`SELECT * FROM "User" WHERE LOWER("email") = ${normalizedEmail} ORDER BY "createdAt" ASC LIMIT 2`,
  );
}

export async function findUserByEmail(email: FormDataEntryValue | string | null, db: DbClient = getDb()) {
  const [user] = await findUsersByEmail(email, db);

  return user ?? null;
}

export async function createUserWithUniquePhone(
  data: {
    name: string;
    phone: FormDataEntryValue | string | null;
    email?: string | null;
    city?: string | null;
    password: string;
  },
  db: DbClient = getDb(),
) {
  const phone = normalizePhone(data.phone);
  const email = data.email ? normalizeEmail(data.email) : null;
  const [existing, existingEmail] = await Promise.all([
    findUserByPhone(phone, db),
    email ? findUserByEmail(email, db) : null,
  ]);

  if (existing) {
    throw new PhoneAlreadyRegisteredError();
  }

  if (existingEmail) {
    throw new EmailAlreadyRegisteredError();
  }

  try {
    return await db.user.create({
      data: {
        name: data.name,
        phone,
        email: email || undefined,
        city: data.city || undefined,
        passwordHash: await bcrypt.hash(data.password, 10),
        globalQrToken: newGlobalQrToken(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("phone")
    ) {
      throw new PhoneAlreadyRegisteredError();
    }

    throw error;
  }
}
