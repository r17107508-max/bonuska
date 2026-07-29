"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

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
        variant === "primary" && "bg-[var(--brand-strong)] text-white shadow-sm hover:bg-[var(--brand)]",
        variant === "secondary" && "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--inactive)]",
        variant === "ghost" && "text-[var(--text)] hover:bg-[var(--inactive)]",
      )}
    >
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  pendingText = "Отправляем...",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        base,
        variant === "primary" && "w-full bg-[var(--brand-strong)] text-white shadow-sm hover:bg-[var(--brand)]",
        variant === "secondary" && "w-full border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--inactive)]",
        variant === "danger" && "w-full bg-[var(--danger)] text-white shadow-sm hover:bg-red-800",
      )}
    >
      {pending ? pendingText : children}
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
        variant === "primary" && "bg-[var(--brand-strong)] text-white hover:bg-[var(--brand)]",
        variant === "secondary" && "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--inactive)]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:bg-red-800",
      )}
    >
      {children}
    </button>
  );
}
