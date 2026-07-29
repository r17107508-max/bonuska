"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { logout } from "@/app/actions";

type NavItem = { href: string; label: string };

const iconByHref = {
  "/company": Home,
  "/company/clients": Users,
  "/company/scan": ScanLine,
  "/company/reports": BarChart3,
  "/company/settings": ShieldCheck,
  "/company/settings#registration-qr": QrCode,
  "/company/raffles": Trophy,
  "/company/staff": UserPlus,
  "/company/billing": CreditCard,
} as const;

const mobileItems = [
  { href: "/company", label: "Панель", icon: Home },
  { href: "/company/clients", label: "Клиенты", icon: Users },
  { href: "/company/scan", label: "Сканер", icon: ScanLine, primary: true },
  { href: "/company/reports", label: "Отчёты", icon: BarChart3 },
  { href: "#more", label: "Ещё", icon: Menu },
] as const;

const moreItems = [
  { href: "/company/settings", label: "Программа лояльности", icon: ShieldCheck },
  { href: "/company/raffles", label: "Розыгрыши", icon: Trophy },
  { href: "/company/staff", label: "Сотрудники", icon: UserPlus },
  { href: "/company/settings#registration-qr", label: "QR-плакат", icon: QrCode },
  { href: "/company/settings#company", label: "Настройки компании", icon: Settings },
  { href: "/company/billing", label: "Подписка и оплата", icon: CreditCard },
] as const;

function cleanHref(href: string) {
  return href.split("#")[0];
}

function isActivePath(pathname: string, href: string) {
  const hrefPath = cleanHref(href);
  if (hrefPath === "/company") {
    return pathname === "/company";
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

export function CompanyDesktopNav({
  nav,
  companyName,
  status,
}: {
  nav: NavItem[];
  companyName: string;
  status?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[240px] shrink-0 border-r border-[var(--border)] bg-white px-3 py-5 lg:flex lg:flex-col">
      <Link href="/company" className="flex min-h-11 items-center gap-2 rounded-xl px-2 font-extrabold text-[var(--text)]">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-black text-white">П</span>
        <span>ПроПлюшка</span>
      </Link>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs font-bold uppercase text-[var(--text-muted)]">Кабинет компании</p>
        <p className="mt-1 line-clamp-2 font-bold text-[var(--text)]">{companyName}</p>
        {status && <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">{status}</p>}
      </div>

      <nav className="mt-5 grid gap-1" aria-label="Разделы кабинета компании">
        {nav.map((item) => {
          const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? FileText;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                active
                  ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--inactive)] hover:text-[var(--text)]"
              }`}
            >
              <Icon aria-hidden className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="mt-auto border-t border-[var(--border)] pt-4">
        <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--danger)] hover:bg-red-50">
          <LogOut aria-hidden className="size-5" />
          Выйти
        </button>
      </form>
    </aside>
  );
}

export function CompanyBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-14px_32px_rgba(64,43,28,0.12)] lg:hidden"
        aria-label="Навигация компании"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "#more" ? isMoreActive : isActivePath(pathname, item.href);

            if (item.href === "#more") {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setIsMoreOpen(true)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition ${
                    active ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--text-muted)] hover:bg-[var(--inactive)]"
                  }`}
                >
                  <Icon aria-hidden className="size-5" />
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            const primary = "primary" in item && item.primary;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  primary
                    ? "flex min-h-16 -translate-y-2 flex-col items-center justify-center gap-1 rounded-full bg-[var(--brand-strong)] px-2 text-[11px] font-bold text-white shadow-lg ring-4 ring-white transition active:scale-95"
                    : `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition ${
                        active ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--text-muted)] hover:bg-[var(--inactive)]"
                      }`
                }
              >
                <Icon aria-hidden className={primary ? "size-6" : "size-5"} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-[#2f1d13]/45 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" aria-labelledby="company-more-title" className="w-full rounded-2xl bg-white p-5 shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 id="company-more-title" className="text-xl font-bold text-[var(--text)]">Ещё</h2>
              <button type="button" onClick={() => setIsMoreOpen(false)} className="min-h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]">
                Закрыть
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 font-bold ${
                      active
                        ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                        : "border-[var(--border)] bg-white text-[var(--text)]"
                    }`}
                  >
                    <Icon aria-hidden className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
              <form action={logout} className="mt-2 border-t border-[var(--border)] pt-3">
                <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-red-50 px-4 font-bold text-[var(--danger)]">
                  <LogOut aria-hidden className="size-5" />
                  Выход
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
