import Link from "next/link";
import { loginCompany } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";

export default async function CompanyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Вход" subtitle="Введите телефон и пароль для доступа к кабинету.">
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={loginCompany} className="mt-6 space-y-4">
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
        <SubmitButton>Войти</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-sm font-semibold">
        <Link href="/company/register" className="text-teal-700">Зарегистрировать компанию</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
