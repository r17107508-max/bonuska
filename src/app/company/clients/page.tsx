import Link from "next/link";
import { CompanyUserRole, Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { AdminShell, companyNavForRole } from "@/components/admin-shell";
import { EmptyCompanyState, maskPhone, SegmentedLinks, StatusPill } from "@/components/company-ui";
import { requireCompanyUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime, phoneLookupValues } from "@/lib/format";

const pageSize = 30;

export default async function CompanyClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string }>;
}) {
  const access = await requireCompanyUser();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const filter = params.filter ?? "all";
  const sort = params.sort ?? "last";
  const page = Math.max(Number(params.page ?? 1), 1);
  const phoneValues = phoneLookupValues(q);
  const goalCount = access.company.loyaltyProgram?.goalCount ?? 6;
  const nearRewardStart = Math.max(goalCount - 1, 1);
  const activeSince = new Date();
  activeSince.setDate(activeSince.getDate() - 30);

  const where: Prisma.CustomerMembershipWhereInput = {
    companyId: access.companyId,
    ...(q
      ? {
          user: {
            OR: [
              { name: { contains: q } },
              { phone: { in: phoneValues } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
            ],
          },
        }
      : {}),
    ...filterWhere(filter, activeSince, nearRewardStart),
  };

  const [clientsTotal, matchedTotal, clients] = await Promise.all([
    getDb().customerMembership.count({ where: { companyId: access.companyId } }),
    getDb().customerMembership.count({ where }),
    getDb().customerMembership.findMany({
      where,
      include: {
        user: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: sortOrder(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const canSeePhone = access.role === CompanyUserRole.COMPANY_ADMIN;
  const isAdmin = access.role === CompanyUserRole.COMPANY_ADMIN;
  const totalPages = Math.max(Math.ceil(matchedTotal / pageSize), 1);
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (filter !== "all") baseParams.set("filter", filter);
  if (sort !== "last") baseParams.set("sort", sort);

  return (
    <AdminShell title="Клиенты" subtitle="Поиск, фильтры, прогресс до подарка и история операций." nav={companyNavForRole(access.role)}>
      {clientsTotal === 0 ? (
        <EmptyCompanyState
          image="empty-clients"
          alt="Пустая клиентская база"
          title="Здесь появятся ваши клиенты"
          text="Когда клиент зарегистрируется по QR-плакату или будет добавлен через сканер, карточка появится в этом списке."
          actionHref="/company/settings#registration-qr"
          actionLabel="Открыть QR-плакат"
        />
      ) : (
        <>
          <form action="/company/clients" method="get" className="panel mb-4 grid gap-3 p-4 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
            <label className="block">
              <span className="text-sm font-bold text-[var(--text)]">Поиск</span>
              <div className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3">
                <Search aria-hidden className="size-5 text-[var(--text-muted)]" />
                <input name="q" defaultValue={q} placeholder="Имя или телефон" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[var(--text)]">Фильтр</span>
              <select name="filter" defaultValue={filter} className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3">
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="sleeping">Спящие</option>
                <option value="near">Близко к подарку</option>
                <option value="reward">Подарок доступен</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[var(--text)]">Сортировка</span>
              <select name="sort" defaultValue={sort} className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3">
                <option value="last">Последняя операция</option>
                <option value="purchases">Покупки</option>
                <option value="progress">Прогресс</option>
              </select>
            </label>
            <button type="submit" className="min-h-11 rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white">
              Применить
            </button>
          </form>

          <div className="mb-4">
            <SegmentedLinks
              active={filter}
              items={[
                { value: "all", label: "Все", href: clientsHref(q, "all", sort) },
                { value: "active", label: "Активные", href: clientsHref(q, "active", sort) },
                { value: "sleeping", label: "Спящие", href: clientsHref(q, "sleeping", sort) },
                { value: "near", label: "Близко к подарку", href: clientsHref(q, "near", sort) },
                { value: "reward", label: "Подарок доступен", href: clientsHref(q, "reward", sort) },
              ]}
            />
          </div>

          {clients.length === 0 ? (
            <div className="panel p-5 text-sm font-semibold text-[var(--text-muted)]">По этому поиску клиентов не найдено.</div>
          ) : (
            <>
              <div className="grid gap-3 lg:hidden">
                {clients.map((client) => (
                  <ClientCard key={client.id} client={client} goalCount={goalCount} canSeePhone={canSeePhone} isAdmin={isAdmin} activeSince={activeSince} />
                ))}
              </div>

              <div className="panel hidden overflow-hidden lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--inactive)] text-xs uppercase text-[var(--text-muted)]">
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
                  <tbody className="divide-y divide-[var(--border)]">
                    {clients.map((client) => (
                      <tr key={client.id} className="bg-white">
                        <td className="px-4 py-3 font-bold text-[var(--text)]">{client.user.name}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{canSeePhone ? client.user.phone : maskPhone(client.user.phone)}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{client.currentCount}/{goalCount}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{client.totalPurchases}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{client.totalRewards}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{formatDateTime(client.transactions[0]?.createdAt)}</td>
                        <td className="px-4 py-3">
                          {isAdmin ? <Link href={`/company/client/${client.id}`} className="font-bold text-[var(--brand-strong)]">Открыть</Link> : <span className="text-[var(--text-muted)]">Только админ</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Показано {clients.length} из {matchedTotal}</p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <PaginationLink disabled={page <= 1} href={`/company/clients?${withPage(baseParams, page - 1)}`}>Назад</PaginationLink>
                <PaginationLink disabled={page >= totalPages} href={`/company/clients?${withPage(baseParams, page + 1)}`}>Дальше</PaginationLink>
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}

function filterWhere(filter: string, activeSince: Date, nearRewardStart: number): Prisma.CustomerMembershipWhereInput {
  if (filter === "active") return { lastActionAt: { gte: activeSince } };
  if (filter === "sleeping") return { totalPurchases: { gt: 0 }, OR: [{ lastActionAt: null }, { lastActionAt: { lt: activeSince } }] };
  if (filter === "near") return { rewardAvailable: false, currentCount: { gte: nearRewardStart } };
  if (filter === "reward") return { rewardAvailable: true };
  return {};
}

function sortOrder(sort: string): Prisma.CustomerMembershipOrderByWithRelationInput[] {
  if (sort === "purchases") return [{ totalPurchases: "desc" }, { updatedAt: "desc" }];
  if (sort === "progress") return [{ rewardAvailable: "desc" }, { currentCount: "desc" }, { updatedAt: "desc" }];
  return [{ lastActionAt: "desc" }, { updatedAt: "desc" }];
}

function clientsHref(q: string, filter: string, sort: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "all") params.set("filter", filter);
  if (sort !== "last") params.set("sort", sort);
  const query = params.toString();
  return query ? `/company/clients?${query}` : "/company/clients";
}

function withPage(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return next.toString();
}

function ClientCard({
  client,
  goalCount,
  canSeePhone,
  isAdmin,
  activeSince,
}: {
  client: {
    id: string;
    user: { name: string; phone: string };
    currentCount: number;
    totalPurchases: number;
    totalRewards: number;
    rewardAvailable: boolean;
    lastActionAt: Date | null;
    transactions: { createdAt: Date }[];
  };
  goalCount: number;
  canSeePhone: boolean;
  isAdmin: boolean;
  activeSince: Date;
}) {
  const status = client.rewardAvailable
    ? { label: "Подарок доступен", tone: "success" as const }
    : client.currentCount >= Math.max(goalCount - 1, 1)
      ? { label: "Близко к подарку", tone: "brand" as const }
      : client.lastActionAt && client.lastActionAt >= activeSince
        ? { label: "Активный", tone: "success" as const }
        : { label: "Спящий", tone: "warning" as const };
  const progress = Math.min(100, Math.round((client.currentCount / Math.max(goalCount, 1)) * 100));
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-[var(--text)]">{client.user.name}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">{canSeePhone ? client.user.phone : maskPhone(client.user.phone)}</p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm font-semibold text-[var(--text-muted)]">
          <span>Прогресс до подарка</span>
          <span>{client.currentCount}/{goalCount}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--inactive)]">
          <div className="h-full rounded-full bg-[var(--brand-strong)]" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Small label="Покупок" value={client.totalPurchases} />
        <Small label="Последняя операция" value={formatDateTime(client.transactions[0]?.createdAt)} />
      </div>
    </>
  );

  return isAdmin ? (
    <Link href={`/company/client/${client.id}`} className="panel block p-4">{content}</Link>
  ) : (
    <article className="panel p-4">{content}</article>
  );
}

function Small({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-bold text-[var(--text)]">{value}</p>
    </div>
  );
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--text-muted)] opacity-50">{children}</span>;
  }

  return <Link href={href} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--text)]">{children}</Link>;
}
