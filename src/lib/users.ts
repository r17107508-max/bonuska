import { Prisma, type PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { PHONE_ALREADY_REGISTERED_MESSAGE, normalizePhone, phoneLookupValues } from "@/lib/format";
import { newGlobalQrToken } from "@/lib/loyalty";

type DbClient = PrismaClient;

export class PhoneAlreadyRegisteredError extends Error {
  constructor() {
    super(PHONE_ALREADY_REGISTERED_MESSAGE);
    this.name = "PhoneAlreadyRegisteredError";
  }
}

export function isPhoneAlreadyRegisteredError(error: unknown) {
  return error instanceof PhoneAlreadyRegisteredError;
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
  const existing = await findUserByPhone(phone, db);

  if (existing) {
    throw new PhoneAlreadyRegisteredError();
  }

  try {
    return await db.user.create({
      data: {
        name: data.name,
        phone,
        email: data.email || undefined,
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
