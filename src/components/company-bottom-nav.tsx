"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Home, LogOut, Menu, QrCode, ScanLine, Settings, UserPlus, Users } from "lucide-react";
import { logout } from "@/app/actions";

const primaryItems = [
  { href: "/company", label: "Панель", icon: Home, primary: false },
  { href: "/company/scan", label: "Сканер", icon: ScanLine, primary: true },
  { href: "/company/clients", label: "Клиенты", icon: Users, primary: false },
  { href: "/company/settings", label: "Настройки", icon: Settings, primary: false },
] as const;

const moreItems = [
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(15,23,42,0.12)] backdrop-blur"
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
                    ? `flex min-h-16 -translate-y-2 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold shadow-lg transition active:scale-95 ${
                        active ? "bg-teal-700 text-white" : "bg-teal-600 text-white hover:bg-teal-700"
                      }`
                    : `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition active:scale-95 ${
                        active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`
                }
              >
                <Icon aria-hidden className={item.primary ? "size-6" : "size-5"} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 active:scale-95"
          >
            <Menu aria-hidden className="size-5" />
            <span className="leading-none">Ещё</span>
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
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
                    className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700"
                  >
                    <Icon aria-hidden className="size-5 text-teal-700" />
                    {item.label}
                  </Link>
                );
              })}
              <form action={logout}>
                <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700">
                  <LogOut aria-hidden className="size-5 text-teal-700" />
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
