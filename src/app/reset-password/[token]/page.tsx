import Link from "next/link";
import { completePasswordReset } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField } from "@/components/form-field";

export default async function ResetPasswordTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);

  return (
    <AuthShell title="Новый пароль" subtitle="Задайте новый пароль. Ссылка одноразовая и действует ограниченное время.">
      {query.error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{query.error}</p>}
      <form action={completePasswordReset} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <FormField label="Новый пароль" name="password" type="password" autoComplete="new-password" />
        <SubmitButton>Сохранить пароль</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-sm font-semibold">
        <Link href="/forgot-password" className="text-[var(--brand)]">Запросить новую ссылку</Link>
        <Link href="/" className="text-slate-500">На главную</Link>
      </div>
    </AuthShell>
  );
}
