"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Clock3, Store, UserRound, WalletCards } from "lucide-react";

const items = [
  { href: "/app/cards", label: "Мои карты", icon: WalletCards },
  { href: "/app/partners", label: "Партнёры", icon: Store },
  { href: "/app/history", label: "История", icon: Clock3 },
  { href: "/app/account", label: "Аккаунт", icon: UserRound },
];

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-100 bg-[#fffdf8]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-12px_32px_rgba(92,53,33,0.12)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition",
                active ? "bg-green-50 text-green-800" : "text-[#7b6a5b] active:bg-amber-50",
              )}
            >
              <Icon aria-hidden className="size-5" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
