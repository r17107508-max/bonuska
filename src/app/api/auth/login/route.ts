import { NextRequest } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { apiError, ok } from "@/lib/api";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await authenticate(String(body.phone ?? ""), String(body.password ?? ""));
  if (!user) {
    return apiError("Неверный телефон или пароль", 401);
  }
  await createSession(user);
  return ok({ id: user.id, name: user.name, phone: user.phone, globalRole: user.globalRole });
}
