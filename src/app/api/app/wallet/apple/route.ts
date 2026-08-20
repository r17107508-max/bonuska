import { NextResponse } from "next/server";
import { CompanyStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createAppleWalletPass } from "@/lib/apple-wallet";
import { ensureGlobalQrToken } from "@/lib/loyalty";

export async function GET() {
  const currentUser = await requireUser("/company/login");
  const user = await getDb().user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { id: true, name: true, globalQrToken: true },
  });
  const globalQrToken = await ensureGlobalQrToken(user);
  const activeCardsCount = await getDb().customerMembership.count({
    where: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
  });

  try {
    const pass = await createAppleWalletPass({ ...user, globalQrToken }, activeCardsCount);
    return new NextResponse(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="proplushka.pkpass"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать Apple Wallet карту" },
      { status: 503 },
    );
  }
}
