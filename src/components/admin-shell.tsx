import Link from "next/link";
import { CompanyUserRole } from "@prisma/client";
import { BrandMark } from "@/components/brand";
import { CashierBottomNav } from "@/components/cashier-bottom-nav";
import { CompanyBottomNav } from "@/components/company-bottom-nav";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string };

export function AdminShell({
  title,
  subtitle,
  children,
  nav,
  cashier,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  nav: NavItem[];
  cashier?: {
    companyName: string;
    status?: string;
  };
}) {
  const isCompanyAdminShell = !cashier && nav.some((item) => item.href === "/company/staff");
  const workspaceShell = Boolean(cashier || isCompanyAdminShell);

  if (workspaceShell) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--text)]">
        <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="hidden border-r border-[var(--border)] bg-white px-4 py-5 lg:flex lg:flex-col">
            <BrandMark compact />
            <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-extrabold uppercase text-[var(--text-muted)]">
                {cashier ? "Рабочее место" : "Кабинет компании"}
              </p>
              <p className="mt-1 font-extrabold text-[var(--text)]">{cashier?.companyName ?? title}</p>
              {cashier?.status && <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">{cashier.status}</p>}
            </div>
            <nav className="mt-5 grid gap-1" aria-label="Разделы кабинета">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-[14px] px-3 text-sm font-extrabold text-[var(--text-muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-5">
              <LogoutButton />
            </div>
          </aside>

          <div className="min-w-0">
            <header className="border-b border-[var(--border)] bg-white/95 backdrop-blur lg:hidden">
              <div className="page-shell flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <BrandMark compact />
                {cashier ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-[var(--inactive)] px-3 py-1 font-semibold text-[var(--text)]">{cashier.companyName}</span>
                    <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 font-semibold text-[var(--brand)]">Кассир</span>
                    {cashier.status && <span className="rounded-full bg-white px-3 py-1 font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">{cashier.status}</span>}
                  </div>
                ) : (
                  <div className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand)]">
                    Кабинет компании
                  </div>
                )}
              </div>
            </header>
            <section className="page-shell py-7 pb-32 lg:w-full lg:max-w-none lg:px-8 lg:py-8 lg:pb-10">
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-[var(--text)]">{title}</h1>
                {subtitle && <p className="mt-2 max-w-3xl text-[var(--text-muted)]">{subtitle}</p>}
              </div>
              {children}
            </section>
          </div>
        </div>
        {cashier && <CashierBottomNav />}
        {isCompanyAdminShell && <CompanyBottomNav />}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact />
          <div className="flex flex-wrap items-center gap-2">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--inactive)]">
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </div>
        </div>
      </header>
      <section className="page-shell py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--text)]">{title}</h1>
          {subtitle && <p className="mt-2 text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {children}
      </section>
    </main>
  );
}

export const superadminNav = [
  { href: "/superadmin", label: "Панель" },
  { href: "/superadmin/companies", label: "Компании" },
  { href: "/superadmin/payments", label: "Оплаты" },
  { href: "/superadmin/settings", label: "Настройки" },
];

export const companyNav = [
  { href: "/company", label: "Панель" },
  { href: "/company/scan", label: "Сканер" },
  { href: "/company/clients", label: "Клиенты" },
  { href: "/company/raffles", label: "Розыгрыши" },
  { href: "/company/settings", label: "Акция" },
  { href: "/company/billing", label: "Оплата" },
  { href: "/company/staff", label: "Сотрудники" },
  { href: "/company/reports", label: "Отчёты" },
];

export const cashierCompanyNav = [
  { href: "/company", label: "Панель" },
  { href: "/company/scan", label: "Сканер" },
];

export function companyNavForRole(role: CompanyUserRole) {
  return role === CompanyUserRole.CASHIER ? cashierCompanyNav : companyNav;
}
