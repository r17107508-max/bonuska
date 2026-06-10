import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { normalizePhone } from "@/lib/format";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  if (!name || phone.length < 10 || password.length < 6) {
    return apiError("Заполните имя, телефон и пароль от 6 символов");
  }
  const existing = await getDb().user.findUnique({ where: { phone } });
  if (existing) {
    return apiError("Телефон уже зарегистрирован", 409);
  }
  const user = await getDb().user.create({
    data: {
      name,
      phone,
      email: body.email ? String(body.email) : null,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await createSession(user);
  return ok({ id: user.id, name: user.name, phone: user.phone }, 201);
}
