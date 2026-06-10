import Link from "next/link";
import { loginSuperadmin } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";

export default async function SuperadminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Вход суперадмина" subtitle="Управление компаниями, оплатами, офертой и настройками сервиса.">
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={loginSuperadmin} className="mt-6 space-y-4">
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Пароль" name="password" type="password" autoComplete="current-password" />
        <SubmitButton>Войти</SubmitButton>
      </form>
      <Link href="/" className="mt-5 inline-block text-sm font-semibold text-teal-700">На главную</Link>
    </AuthShell>
  );
}
