import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Восстановление доступа" subtitle="Введите телефон или email. Если аккаунт найден, мы отправим одноразовую ссылку для смены пароля.">
      {params.sent && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{params.message ?? "Если пользователь найден, ссылка для восстановления отправлена на email"}</p>}
      {params.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
      <form action={requestPasswordReset} className="mt-6 space-y-4">
        <FormField label="Телефон или email" name="identifier" autoComplete="username" />
        <SubmitButton>Отправить ссылку</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-sm font-semibold">
        <Link href="/company/login" className="text-teal-700">Вернуться ко входу</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
