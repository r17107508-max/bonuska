"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Gift, Home, MapPinned, QrCode, UserRound } from "lucide-react";

const items = [
  { href: "/app", label: "Главная", icon: Home },
  { href: "/app/partners", label: "Партнёры", icon: MapPinned },
  { href: "/app/qr", label: "QR", icon: QrCode, featured: true },
  { href: "/app/rewards", label: "Награды", icon: Gift },
  { href: "/app/account", label: "Профиль", icon: UserRound },
];

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-12px_32px_rgba(92,53,33,0.12)] backdrop-blur" aria-label="Основная навигация клиента">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition motion-reduce:transition-none",
                item.featured && "relative -mt-5 min-h-[68px] rounded-3xl bg-[var(--brand-strong)] text-white shadow-lg shadow-[rgba(201,71,38,0.22)]",
                item.featured && active && "ring-4 ring-[var(--brand-soft)]",
                !item.featured && (active ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--text-muted)] active:bg-[var(--inactive)]"),
              )}
            >
              <Icon aria-hidden className={clsx("size-5", item.featured && "size-6")} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
