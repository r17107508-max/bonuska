import Link from "next/link";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function CompanyClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const params = await searchParams;
  const q = params.q?.trim();
  const clients = await getDb().customerMembership.findMany({
    where: {
      companyId: access.companyId,
      ...(q
        ? {
            user: {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q.replace(/\D/g, "") } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AdminShell title="Клиенты" subtitle="Поиск по имени или телефону, прогресс и последняя операция." nav={companyNav}>
      <form className="mb-5 flex gap-3">
        <input name="q" defaultValue={q ?? ""} placeholder="Имя или телефон" className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" />
        <button className="rounded-lg bg-teal-700 px-4 font-semibold text-white">Найти</button>
      </form>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Прогресс</th>
                <th className="px-4 py-3">Покупок</th>
                <th className="px-4 py-3">Подарков</th>
                <th className="px-4 py-3">Последняя операция</th>
                <th className="px-4 py-3">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clients.map((client) => (
                <tr key={client.id} className="bg-white">
                  <td className="px-4 py-3 font-semibold text-slate-950">{client.user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{client.user.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{client.currentCount}{client.rewardAvailable ? " · подарок доступен" : ""}</td>
                  <td className="px-4 py-3 text-slate-600">{client.totalPurchases}</td>
                  <td className="px-4 py-3 text-slate-600">{client.totalRewards}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(client.transactions[0]?.createdAt)}</td>
                  <td className="px-4 py-3"><Link href={`/company/client/${client.id}`} className="font-semibold text-teal-700">Открыть</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <p className="p-5 text-slate-500">Клиенты не найдены.</p>}
        </div>
      </div>
    </AdminShell>
  );
}
