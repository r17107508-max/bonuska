"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, ScanLine, Users } from "lucide-react";
import { logout } from "@/app/actions";

const navItems = [
  { href: "/company", label: "Панель", icon: Home, primary: false },
  { href: "/company/scan", label: "Сканер", icon: ScanLine, primary: true },
  { href: "/company/clients", label: "Клиенты", icon: Users, primary: false },
] as const;

export function CashierBottomNav() {
  const pathname = usePathname();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/95 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(25,25,25,0.1)] backdrop-blur lg:hidden"
        aria-label="Навигация кассира"
      >
        <div className="mx-auto grid max-w-xl grid-cols-4 items-end gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/company" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  item.primary
                    ? `flex min-h-16 -translate-y-2 flex-col items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold shadow-lg transition active:scale-95 ${
                        active ? "bg-[var(--brand-strong)] text-white" : "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]"
                      }`
                    : `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs font-semibold transition active:scale-95 ${
                        active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:bg-[var(--inactive)] hover:text-[var(--text)]"
                      }`
                }
              >
                <Icon aria-hidden className={item.primary ? "size-6" : "size-5"} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--inactive)] hover:text-[var(--text)] active:scale-95"
          >
            <LogOut aria-hidden className="size-5" />
            <span>Выйти</span>
          </button>
        </div>
      </nav>

      {isLogoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#2f1d13]/45 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashier-logout-title"
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            style={{ maxHeight: "calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}
          >
            <div className="overflow-y-auto p-5">
              <h2 id="cashier-logout-title" className="text-xl font-semibold text-slate-950">
                Выйти из аккаунта кассира?
              </h2>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-white p-5">
              <button
                type="button"
                onClick={() => setIsLogoutOpen(false)}
                className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-4 font-semibold text-[var(--text)] transition hover:bg-[var(--inactive)]"
              >
                Отмена
              </button>
              <form action={logout}>
                <button type="submit" className="min-h-12 w-full rounded-lg bg-[var(--brand)] px-4 font-semibold text-white transition hover:bg-[var(--brand-strong)]">
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
