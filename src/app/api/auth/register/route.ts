import { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { apiError, ok } from "@/lib/api";
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  PHONE_ALREADY_REGISTERED_MESSAGE,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
} from "@/lib/format";
import {
  createUserWithUniquePhone,
  findUserByPhone,
  isEmailAlreadyRegisteredError,
  isPhoneAlreadyRegisteredError,
} from "@/lib/users";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const phone = normalizePhone(String(body.phone ?? ""));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  if (!name || phone.length < 10 || password.length < 6) {
    return apiError("Заполните имя, телефон, email и пароль от 6 символов");
  }
  if (!isValidEmail(email)) {
    return apiError(INVALID_EMAIL_MESSAGE);
  }
  const existing = await findUserByPhone(phone);
  if (existing) {
    return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
  }
  let user: Awaited<ReturnType<typeof createUserWithUniquePhone>>;
  try {
    user = await createUserWithUniquePhone({
      name,
      phone,
      email,
      password,
    });
  } catch (error) {
    if (isPhoneAlreadyRegisteredError(error)) {
      return apiError(PHONE_ALREADY_REGISTERED_MESSAGE, 409);
    }
    if (isEmailAlreadyRegisteredError(error)) {
      return apiError(EMAIL_ALREADY_REGISTERED_MESSAGE, 409);
    }

    throw error;
  }
  await createSession(user);
  return ok({ id: user.id, name: user.name, phone: user.phone }, 201);
}
