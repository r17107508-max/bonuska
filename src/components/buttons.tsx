"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { MouseEvent } from "react";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        base,
        variant === "primary" && "bg-teal-700 text-white shadow-sm hover:bg-teal-800",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
      )}
    >
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type="submit"
      className={clsx(
        base,
        variant === "primary" && "w-full bg-teal-700 text-white shadow-sm hover:bg-teal-800",
        variant === "secondary" && "w-full border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "danger" && "w-full bg-red-700 text-white shadow-sm hover:bg-red-800",
      )}
    >
      {children}
    </button>
  );
}

export function InlineSubmit({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  function confirmAction(event: MouseEvent<HTMLButtonElement>) {
    const label = typeof children === "string" ? children : "это действие";
    if (!window.confirm(`Подтвердить действие: ${label}?`)) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      onClick={confirmAction}
      className={clsx(
        base,
        variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
      )}
    >
      {children}
    </button>
  );
}
