import Link from "next/link";
import { CompanyUserRole } from "@prisma/client";
import { BrandMark } from "@/components/brand";
import { CashierBottomNav } from "@/components/cashier-bottom-nav";
import { CompanyBottomNav } from "@/components/company-bottom-nav";
import { LogoutButton } from "@/components/logout-button";

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
  nav: { href: string; label: string }[];
  cashier?: {
    companyName: string;
    status?: string;
  };
}) {
  const isCompanyAdminShell = !cashier && nav.some((item) => item.href === "/company/staff");

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact />
          {cashier ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-900">{cashier.companyName}</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-800">Кассир</span>
              {cashier.status && <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">{cashier.status}</span>}
            </div>
          ) : isCompanyAdminShell ? (
            <div className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
              Кабинет компании
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  {item.label}
                </Link>
              ))}
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <section className={`page-shell py-8 ${cashier || isCompanyAdminShell ? "pb-32" : ""}`}>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
        </div>
        {children}
      </section>
      {cashier && <CashierBottomNav />}
      {isCompanyAdminShell && <CompanyBottomNav />}
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
