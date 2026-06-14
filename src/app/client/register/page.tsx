import Link from "next/link";
import { CompanyStatus, GlobalRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { registerClientAccount } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ClientRegisterPage({
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
    <AuthShell title="Стать клиентом" subtitle="Зарегистрируйтесь один раз и получите общий QR-код для партнёров сервиса «ПроПлюшка».">
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={registerClientAccount} className="mt-6 space-y-4">
        <FormField label="Имя" name="name" autoComplete="name" />
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Город" name="city" autoComplete="address-level2" />
        <FormField label="Пароль" name="password" type="password" autoComplete="new-password" />
        <label className="flex gap-3 text-sm font-medium text-slate-700">
          <input name="privacyAccepted" type="checkbox" required className="mt-1 size-4" />
          <span>Согласен на обработку персональных данных. <Link href="/privacy" className="font-semibold text-teal-700" target="_blank">Политика</Link></span>
        </label>
        <SubmitButton>Стать клиентом</SubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-semibold">
        <Link href="/client/login" className="text-teal-700">Уже есть аккаунт</Link>
        <Link href="/partners" className="text-teal-700">Посмотреть партнёров</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
