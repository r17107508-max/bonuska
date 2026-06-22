import { createStaff } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companyRoleLabel, formatDateTime } from "@/lib/format";

export default async function CompanyStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [access, params] = await Promise.all([requireCompanyAdmin(), searchParams]);
  const staff = await getDb().companyUser.findMany({
    where: { companyId: access.companyId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AdminShell title="Сотрудники" subtitle="Добавление кассиров и администраторов компании." nav={companyNav}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form action={createStaff} className="panel space-y-4 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Добавить сотрудника</h2>
          {params.error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}
          <FormField label="Имя" name="name" />
          <FormField label="Телефон" name="phone" />
          <FormField label="Пароль" name="password" type="password" />
          <SelectField label="Роль" name="role" options={[
            { value: "CASHIER", label: "Кассир" },
            { value: "COMPANY_ADMIN", label: "Админ компании" },
          ]} />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input name="isActive" type="checkbox" defaultChecked className="size-4" />
            Активен
          </label>
          <SubmitButton>Сохранить сотрудника</SubmitButton>
        </form>

        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Имя</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Создан</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staff.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-4 py-3 font-semibold text-slate-950">{item.user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.user.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{companyRoleLabel(item.role)}</td>
                    <td className="px-4 py-3"><span className={`badge ${item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{item.isActive ? "Активен" : "Заблокирован"}</span></td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
