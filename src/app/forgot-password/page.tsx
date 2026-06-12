import Link from "next/link";
import { resetPassword } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Восстановление доступа" subtitle="Введите телефон и email, указанные при регистрации. После проверки задайте новый пароль.">
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={resetPassword} className="mt-6 space-y-4">
        <FormField label="Телефон" name="phone" autoComplete="tel" />
        <FormField label="Email" name="email" type="email" autoComplete="email" />
        <FormField label="Новый пароль" name="password" type="password" autoComplete="new-password" />
        <SubmitButton>Сохранить новый пароль</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-sm font-semibold">
        <Link href="/company/login" className="text-teal-700">Вернуться ко входу</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
