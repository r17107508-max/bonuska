"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Home, LogOut, Menu, QrCode, ScanLine, Settings, Trophy, UserPlus, Users } from "lucide-react";
import { logout } from "@/app/actions";

const primaryItems = [
  { href: "/company", label: "Панель", icon: Home, primary: false },
  { href: "/company/scan", label: "Сканер", icon: ScanLine, primary: true },
  { href: "/company/clients", label: "Клиенты", icon: Users, primary: false },
  { href: "/company/settings", label: "Настройки", icon: Settings, primary: false },
] as const;

const moreItems = [
  { href: "/company/raffles", label: "Розыгрыши", icon: Trophy },
  { href: "/company/staff", label: "Сотрудники", icon: UserPlus },
  { href: "/company/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/company/billing", label: "Оплата", icon: CreditCard },
  { href: "/company/settings#registration-qr", label: "QR-плакат", icon: QrCode },
] as const;

export function CompanyBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/95 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(25,25,25,0.1)] backdrop-blur lg:hidden"
        aria-label="Навигация компании"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/company" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  item.primary
                    ? `flex min-h-16 -translate-y-2 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold text-white shadow-lg ring-1 ring-white/35 transition hover:bg-[var(--brand-strong)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(255,106,61,0.25)] active:scale-95 ${
                        active ? "bg-[var(--brand-strong)]" : "bg-[var(--brand-strong)]"
                      }`
                    : `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(255,106,61,0.20)] active:scale-95 ${
                        active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:bg-[var(--inactive)] hover:text-[var(--text)]"
                      }`
                }
              >
                <Icon aria-hidden className={item.primary ? "size-6 drop-shadow-sm" : "size-5"} />
                <span className={item.primary ? "leading-none drop-shadow-sm" : "leading-none"}>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--inactive)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(255,106,61,0.20)] active:scale-95"
          >
            <Menu aria-hidden className="size-5" />
            <span className="leading-none">Ещё</span>
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-[#2f1d13]/45 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" aria-labelledby="company-more-title" className="w-full rounded-xl bg-white p-5 shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 id="company-more-title" className="text-xl font-semibold text-slate-950">
                Ещё
              </h2>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 font-semibold text-[var(--text)]"
                  >
                    <Icon aria-hidden className="size-5 text-[var(--brand)]" />
                    {item.label}
                  </Link>
                );
              })}
              <form action={logout}>
                <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 font-semibold text-[var(--text)]">
                  <LogOut aria-hidden className="size-5 text-[var(--brand)]" />
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
