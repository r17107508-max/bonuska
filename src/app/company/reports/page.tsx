import { AdminShell, companyNav } from "@/components/admin-shell";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function CompanyReportsPage() {
  const access = await requireCompanyAdmin();
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [purchasesToday, purchasesMonth, rewards, activeClients, topClients] = await Promise.all([
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: today } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "PURCHASE", createdAt: { gte: monthStart } } }),
    getDb().loyaltyTransaction.count({ where: { companyId: access.companyId, type: "REWARD_GRANTED" } }),
    getDb().customerMembership.count({ where: { companyId: access.companyId, totalPurchases: { gt: 0 } } }),
    getDb().customerMembership.findMany({
      where: { companyId: access.companyId },
      include: { user: true },
      orderBy: { totalPurchases: "desc" },
      take: 10,
    }),
  ]);

  return (
    <AdminShell title="Отчеты" subtitle="Базовая статистика покупок, подарков и активных клиентов." nav={companyNav}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Покупок сегодня" value={purchasesToday} />
        <Metric label="Покупок за месяц" value={purchasesMonth} />
        <Metric label="Выдано подарков" value={rewards} />
        <Metric label="Активных клиентов" value={activeClients} />
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Топ клиентов</h2>
        <div className="mt-4 divide-y divide-slate-200">
          {topClients.map((client) => (
            <div key={client.id} className="flex items-center justify-between py-3">
              <span>
                <span className="font-semibold">{client.user.name}</span>
                <span className="ml-2 text-sm text-slate-500">{client.user.phone}</span>
              </span>
              <span className="font-semibold text-teal-700">{client.totalPurchases}</span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
