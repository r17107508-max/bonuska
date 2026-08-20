import Link from "next/link";
import { CompanyUserRole } from "@prisma/client";
import { BrandMark } from "@/components/brand";
import { CashierBottomNav } from "@/components/cashier-bottom-nav";
import { CompanyBottomNav, CompanyDesktopNav } from "@/components/company-bottom-nav";
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
  const companyName = cashier?.companyName ?? title;

  if (workspaceShell) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--text)]">
        <div className="lg:flex lg:min-h-screen">
          <CompanyDesktopNav nav={nav} companyName={companyName} status={cashier?.status} />

          <div className="min-w-0 flex-1">
            <header className="border-b border-[var(--border)] bg-white/95 backdrop-blur lg:hidden">
              <div className="page-shell flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <BrandMark compact />
                {cashier ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-[var(--inactive)] px-3 py-1 font-semibold text-[var(--text)]">{cashier.companyName}</span>
                    <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 font-semibold text-[var(--brand-strong)]">Кассир</span>
                    {cashier.status && <span className="rounded-full bg-white px-3 py-1 font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">{cashier.status}</span>}
                  </div>
                ) : (
                  <div className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-strong)]">Кабинет компании</div>
                )}
              </div>
            </header>
            <section className="page-shell company-workspace py-6 pb-32 lg:mx-0 lg:px-8 lg:py-8 lg:pb-10 xl:px-10">
              <div className="mb-6">
                <h1 className="text-[28px] font-extrabold leading-tight text-[var(--text)] sm:text-3xl">{title}</h1>
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
  { href: "/superadmin/recovery", label: "Восстановление" },
  { href: "/superadmin/settings", label: "Настройки" },
];

export const companyNav = [
  { href: "/company", label: "Панель" },
  { href: "/company/clients", label: "Клиенты" },
  { href: "/company/scan", label: "Сканер" },
  { href: "/company/reports", label: "Отчёты" },
  { href: "/company/settings", label: "Программа" },
  { href: "/company/raffles", label: "Розыгрыши" },
  { href: "/company/staff", label: "Сотрудники" },
  { href: "/company/settings#registration-qr", label: "QR-плакат" },
  { href: "/company/billing", label: "Подписка" },
];

export const cashierCompanyNav = [
  { href: "/company", label: "Панель" },
  { href: "/company/scan", label: "Сканер" },
  { href: "/company/clients", label: "Клиенты" },
];

export function companyNavForRole(role: CompanyUserRole) {
  return role === CompanyUserRole.CASHIER ? cashierCompanyNav : companyNav;
}
