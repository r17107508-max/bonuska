"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Clock3, Gift, Home, QrCode, UserRound } from "lucide-react";

const items = [
  { href: "/app", label: "Главная", icon: Home },
  { href: "/app/rewards", label: "Награды", icon: Gift },
  { href: "/app/qr", label: "QR-код", icon: QrCode, featured: true },
  { href: "/app/history", label: "История", icon: Clock3 },
  { href: "/app/account", label: "Профиль", icon: UserRound },
];

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-100 bg-[#fffdf8]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-12px_32px_rgba(92,53,33,0.12)] backdrop-blur">
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
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10.5px] font-semibold transition",
                item.featured && "relative -mt-5 min-h-[68px] bg-green-700 text-white shadow-lg shadow-green-900/20",
                item.featured && active && "bg-green-800 text-white",
                !item.featured && (active ? "bg-green-50 text-green-800" : "text-[#7b6a5b] active:bg-amber-50"),
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
