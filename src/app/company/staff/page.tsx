import { CompanyUserRole } from "@prisma/client";
import { createStaff, updateCompanyStaff } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { WorkspaceCard, StatusPill, maskPhone } from "@/components/company-ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { FormField, SelectField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companyRoleLabel, formatDateTime } from "@/lib/format";

const roleDescriptions: Record<CompanyUserRole, string> = {
  COMPANY_ADMIN: "Полный доступ к настройкам, отчётам, сотрудникам и операциям компании.",
  CASHIER: "Может сканировать QR, начислять покупки, выдавать подарки и видеть ограниченные данные клиентов.",
};

export default async function CompanyStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [access, params] = await Promise.all([requireCompanyAdmin(), searchParams]);
  const db = getDb();
  const [staff, cashierStats] = await Promise.all([
    db.companyUser.findMany({
      where: { companyId: access.companyId },
      include: { user: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    db.loyaltyTransaction.groupBy({
      by: ["cashierId"],
      where: { companyId: access.companyId },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);
  const statsByUserId = new Map(cashierStats.map((item) => [item.cashierId, item]));

  return (
    <AdminShell title="Сотрудники" subtitle="Роли, доступы и рабочая активность команды." nav={companyNav}>
      {params.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{params.error}</p>}
      {params.success && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Изменения сохранены.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text)]">Команда</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Сначала список сотрудников, затем добавление нового доступа.</p>
            </div>
            <a href="#add-staff" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white">
              Добавить сотрудника
            </a>
          </div>

          {staff.length === 0 ? (
            <WorkspaceCard>
              <p className="font-semibold text-[var(--text)]">Сотрудников пока нет.</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Добавьте кассира, чтобы он мог работать со сканером без доступа к настройкам.</p>
            </WorkspaceCard>
          ) : (
            <div className="grid gap-3">
              {staff.map((item) => {
                const stats = statsByUserId.get(item.userId);
                const isSelf = item.userId === access.userId;

                return (
                  <WorkspaceCard key={item.id} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-extrabold text-[var(--text)]">{item.user.name}</h3>
                          <StatusPill tone={item.isActive ? "success" : "danger"}>{item.isActive ? "Активен" : "Заблокирован"}</StatusPill>
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{maskPhone(item.user.phone)}</p>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                          <span className="font-bold text-[var(--text)]">{companyRoleLabel(item.role)}</span>
                          {" - "}
                          {roleDescriptions[item.role]}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm md:min-w-56">
                        <Metric label="Операций" value={stats?._count._all ?? 0} />
                        <Metric label="Активность" value={formatDateTime(stats?._max.createdAt)} />
                      </div>
                    </div>

                    <details className="rounded-xl border border-[var(--border)] bg-white">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[var(--text)]">Действия</summary>
                      <div className="grid gap-3 border-t border-[var(--border)] p-4 lg:grid-cols-2">
                        <form action={updateCompanyStaff} className="grid gap-3">
                          <input type="hidden" name="staffId" value={item.id} />
                          <input type="hidden" name="mode" value="role" />
                          <SelectField
                            label="Роль"
                            name="role"
                            defaultValue={item.role}
                            options={[
                              { value: "CASHIER", label: "Кассир" },
                              { value: "COMPANY_ADMIN", label: "Администратор компании" },
                            ]}
                          />
                          <SubmitButton variant="secondary">Изменить роль</SubmitButton>
                        </form>

                        <form action={updateCompanyStaff} className="grid gap-3">
                          <input type="hidden" name="staffId" value={item.id} />
                          <input type="hidden" name="mode" value="reset" />
                          <FormField label="Временный пароль" name="temporaryPassword" type="password" required={false} placeholder="Минимум 6 символов" />
                          <p className="text-xs font-semibold text-[var(--warning)]">Передайте временный пароль сотруднику и попросите заменить его после входа.</p>
                          <SubmitButton variant="secondary">Сбросить доступ</SubmitButton>
                        </form>

                        {item.isActive ? (
                          <form action={updateCompanyStaff}>
                            <input type="hidden" name="staffId" value={item.id} />
                            <input type="hidden" name="mode" value="block" />
                            <ConfirmSubmit
                              danger
                              title="Заблокировать сотрудника?"
                              confirmText={isSelf ? "Себя заблокировать нельзя. Сервер отклонит это действие." : "Сотрудник не сможет войти в кабинет компании."}
                              buttonText="Временно заблокировать"
                              confirmButtonText="Заблокировать"
                            />
                          </form>
                        ) : (
                          <form action={updateCompanyStaff}>
                            <input type="hidden" name="staffId" value={item.id} />
                            <input type="hidden" name="mode" value="restore" />
                            <SubmitButton variant="secondary">Восстановить доступ</SubmitButton>
                          </form>
                        )}

                        <form action={updateCompanyStaff}>
                          <input type="hidden" name="staffId" value={item.id} />
                          <input type="hidden" name="mode" value="archive" />
                          <ConfirmSubmit
                            danger
                            title="Архивировать сотрудника?"
                            confirmText={isSelf ? "Себя архивировать нельзя. Сервер отклонит это действие." : "Доступ будет выключен, история операций останется в отчётах."}
                            buttonText="Удалить или архивировать"
                            confirmButtonText="Архивировать"
                          />
                        </form>
                      </div>
                    </details>
                  </WorkspaceCard>
                );
              })}
            </div>
          )}
        </section>

        <WorkspaceCard id="add-staff" className="h-fit">
          <form action={createStaff} className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--brand-strong)]">Новый доступ</p>
              <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">Добавить сотрудника</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Если приглашения ещё не поддерживаются сервером, создаётся временный пароль.</p>
            </div>
            <FormField label="Имя" name="name" />
            <FormField label="Телефон" name="phone" autoComplete="tel" />
            <FormField label="Временный пароль" name="password" type="password" autoComplete="new-password" />
            <SelectField
              label="Роль"
              name="role"
              options={[
                { value: "CASHIER", label: "Кассир" },
                { value: "COMPANY_ADMIN", label: "Администратор компании" },
              ]}
            />
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <input name="isActive" type="checkbox" defaultChecked className="size-4" />
              Активен
            </label>
            <SubmitButton>Сохранить сотрудника</SubmitButton>
          </form>
        </WorkspaceCard>
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--text)]">{value}</p>
    </div>
  );
}
