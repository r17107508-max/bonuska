import Link from "next/link";
import { CompanyStatus, GlobalRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { loginClientAccount } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);

  if (currentUser && !params.error) {
    if (currentUser.globalRole === GlobalRole.SUPERADMIN) {
      redirect("/superadmin");
    }

    const companyUser = await getDb().companyUser.findFirst({
      where: { userId: currentUser.id, isActive: true, company: { status: { not: CompanyStatus.DELETED } } },
      select: { id: true },
    });

    redirect(companyUser ? "/company" : "/app");
  }

  return (
    <AuthShell title="Вход для клиента" subtitle="Откройте общий QR-код, бонусные карты и прогресс до подарков.">
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={loginClientAccount} className="mt-6 space-y-4">
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
        <SubmitButton>Войти как клиент</SubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-semibold">
        <Link href="/client/register" className="text-teal-700">Стать клиентом</Link>
        <Link href="/forgot-password" className="text-teal-700">Забыли пароль?</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
