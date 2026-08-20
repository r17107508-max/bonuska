import { AdminShell, superadminNav } from "@/components/admin-shell";
import { CopyButton } from "@/components/copy-button";
import { requireSuperadmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

type RecoveryMeta = {
  userId?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  resetUrl?: string;
  expiresAt?: string;
  ip?: string;
  userAgent?: string;
  status?: string;
};

export default async function SuperadminRecoveryPage() {
  await requireSuperadmin();
  const logs = await getDb().auditLog.findMany({
    where: { action: "PASSWORD_RESET_SUPPORT_REQUESTED", entityType: "PasswordRecoveryRequest" },
    include: { actor: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const tokenIds = logs.map((log) => log.entityId).filter((id): id is string => Boolean(id));
  const tokens = tokenIds.length
    ? await getDb().passwordResetToken.findMany({
        where: { id: { in: tokenIds } },
        select: { id: true, expiresAt: true, usedAt: true },
      })
    : [];
  const tokenById = new Map(tokens.map((token) => [token.id, token]));

  return (
    <AdminShell title="Восстановление доступа" subtitle="Заявки пользователей без email. Перед передачей ссылки обязательно проверьте личность по телефону." nav={superadminNav}>
      <section className="panel p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Заявки без email</h2>
            <p className="mt-2 text-sm text-slate-600">
              Одноразовую ссылку можно передать пользователю только после проверки, что телефон действительно принадлежит ему.
            </p>
          </div>
          <span className="badge bg-slate-100 text-slate-700">{logs.length}</span>
        </div>

        <div className="mt-5 divide-y divide-slate-200">
          {logs.map((log) => {
            const meta = parseRecoveryMeta(log.metadataJson);
            const token = log.entityId ? tokenById.get(log.entityId) : null;
            const expired = token ? token.expiresAt <= new Date() : meta.expiresAt ? new Date(meta.expiresAt) <= new Date() : false;
            const used = Boolean(token?.usedAt);
            const available = Boolean(meta.resetUrl) && !used && !expired;

            return (
              <article key={log.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{meta.name || log.actor?.name || "Пользователь"}</h3>
                    <StatusBadge used={used} expired={expired} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Телефон: {meta.phone || log.actor?.phone || "не указан"} · Email: {meta.email || log.actor?.email || "не указан"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Запрошено: {formatDateTime(log.createdAt)} · Действует до: {formatDateTime(token?.expiresAt ?? (meta.expiresAt ? new Date(meta.expiresAt) : null))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">IP: {meta.ip || "не указан"}</p>
                  {available && <p className="mt-2 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{meta.resetUrl}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {available ? (
                    <CopyButton text={meta.resetUrl!}>Скопировать ссылку</CopyButton>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500">
                      Ссылка недоступна
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {logs.length === 0 && <p className="py-4 text-sm text-slate-500">Заявок на ручное восстановление пока нет.</p>}
        </div>
      </section>
    </AdminShell>
  );
}

function StatusBadge({ used, expired }: { used: boolean; expired: boolean }) {
  if (used) {
    return <span className="badge bg-emerald-50 text-emerald-800">Использована</span>;
  }

  if (expired) {
    return <span className="badge bg-red-50 text-red-800">Истекла</span>;
  }

  return <span className="badge bg-amber-50 text-amber-900">Ожидает проверки</span>;
}

function parseRecoveryMeta(metadataJson: string | null): RecoveryMeta {
  if (!metadataJson) {
    return {};
  }

  try {
    return JSON.parse(metadataJson) as RecoveryMeta;
  } catch {
    return {};
  }
}
