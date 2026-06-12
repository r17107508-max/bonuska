import Link from "next/link";
import { redirect } from "next/navigation";
import { loginCompany } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";
import { getCurrentUser, getUserHomePath } from "@/lib/auth";

export default async function CompanyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();

  if (currentUser && !params.error) {
    redirect(await getUserHomePath(currentUser));
  }

  return (
    <AuthShell title="Вход" subtitle="Введите телефон и пароль для доступа к кабинету.">
      {params.reset && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Пароль обновлён. Теперь войдите с новым паролем.</p>}
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={loginCompany} className="mt-6 space-y-4">
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
        <SubmitButton>Войти</SubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-semibold">
        <Link href="/company/register" className="text-teal-700">Зарегистрировать компанию</Link>
        <Link href="/forgot-password" className="text-teal-700">Забыли пароль?</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
