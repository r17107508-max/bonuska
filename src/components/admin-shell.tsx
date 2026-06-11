import Link from "next/link";
import { CompanyUserRole } from "@prisma/client";
import { BrandMark } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";

export function AdminShell({
  title,
  subtitle,
  children,
  nav,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  nav: { href: string; label: string }[];
}) {
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact />
          <div className="flex flex-wrap items-center gap-2">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </div>
        </div>
      </header>
      <section className="page-shell py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
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
  { href: "/company/settings", label: "Акция" },
  { href: "/company/staff", label: "Сотрудники" },
  { href: "/company/reports", label: "Отчеты" },
];

export const cashierCompanyNav = [
  { href: "/company", label: "Панель" },
  { href: "/company/scan", label: "Сканер" },
];

export function companyNavForRole(role: CompanyUserRole) {
  return role === CompanyUserRole.CASHIER ? cashierCompanyNav : companyNav;
}
