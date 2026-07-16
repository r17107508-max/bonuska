"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { CheckCircle2, ChevronDown, Info, X } from "lucide-react";
import { useState, type ReactNode } from "react";

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-extrabold transition duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(255,106,61,0.25)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55";

export function UiButton({
  children,
  className,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        buttonBase,
        variant === "primary" && "bg-[var(--brand)] text-white shadow-[0_12px_24px_rgba(255,106,61,0.22)] hover:bg-[var(--brand-strong)]",
        variant === "secondary" && "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--inactive)]",
        variant === "ghost" && "text-[var(--text-muted)] hover:bg-[var(--inactive)]",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function UiButtonLink({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        buttonBase,
        variant === "primary" && "bg-[var(--brand)] text-white shadow-[0_12px_24px_rgba(255,106,61,0.22)] hover:bg-[var(--brand-strong)]",
        variant === "secondary" && "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--inactive)]",
        variant === "ghost" && "text-[var(--text-muted)] hover:bg-[var(--inactive)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function UiCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(25,25,25,0.1)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UiInput({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  const id = props.id ?? props.name;

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[var(--text)]">{label}</span>}
      <input
        {...props}
        id={id}
        className={clsx(
          "min-h-12 w-full rounded-[12px] border border-[var(--border)] bg-white px-4 text-[15px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.14)] disabled:bg-[var(--inactive)]",
          error && "border-red-400 focus:border-red-500 focus:ring-red-500/15",
          className,
        )}
      />
      {error && <span className="mt-1.5 block text-sm font-semibold text-red-700">{error}</span>}
    </label>
  );
}

export function UiSelect({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[var(--text)]">{label}</span>}
      <span className="relative block">
        <select
          {...props}
          className={clsx(
            "min-h-12 w-full appearance-none rounded-[12px] border border-[var(--border)] bg-white px-4 pr-10 text-[15px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.14)] disabled:bg-[var(--inactive)]",
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[var(--text-muted)]" />
      </span>
    </label>
  );
}

export function UiBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold",
        tone === "neutral" && "bg-[var(--inactive)] text-[var(--text-muted)]",
        tone === "brand" && "bg-[var(--brand-soft)] text-[var(--brand-ink)]",
        tone === "success" && "bg-emerald-50 text-emerald-800",
        tone === "warning" && "bg-[rgba(255,200,87,0.24)] text-[#7a4b00]",
        tone === "danger" && "bg-red-50 text-red-800",
      )}
    >
      {children}
    </span>
  );
}

export function UiProgress({
  value,
  max,
  label,
  markers = false,
}: {
  value: number;
  max: number;
  label?: string;
  markers?: boolean;
}) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div>
      {label && <p className="mb-2 text-sm font-bold text-[var(--text-muted)]">{label}</p>}
      <div className="h-3 overflow-hidden rounded-full bg-[var(--inactive)]">
        <div className="animated-progress h-full rounded-full bg-[var(--brand)]" style={{ width: `${percent}%` }} />
      </div>
      {markers && (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(safeMax, 12)}, minmax(0, 1fr))` }}>
          {Array.from({ length: safeMax }).map((_, index) => {
            const filled = index < safeValue;
            return (
              <span
                key={index}
                aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
                className={clsx(
                  "flex aspect-square min-h-9 items-center justify-center rounded-[12px] border text-xs font-black",
                  filled ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--inactive)] text-[var(--text-muted)]",
                )}
              >
                {filled ? <CheckCircle2 aria-hidden className="size-4" /> : index + 1}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UiEmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-white p-5 text-[var(--text)]">
      <Info aria-hidden className="size-6 text-[var(--brand)]" />
      <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function UiDataTable({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm text-[var(--text)]">
        {children}
      </table>
    </div>
  );
}

export function UiModal({
  title,
  children,
  trigger,
}: {
  title: string;
  children: ReactNode;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/45 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[20px] bg-white p-5 shadow-2xl sm:max-w-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-[var(--text)]">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="flex size-11 items-center justify-center rounded-[12px] border border-[var(--border)] bg-white text-[var(--text)]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}

export function UiToast({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "danger" | "neutral";
}) {
  return (
    <div
      role="status"
      className={clsx(
        "flex items-start gap-3 rounded-[16px] border p-4 text-sm font-bold shadow-[var(--shadow-card)]",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        tone === "danger" && "border-red-200 bg-red-50 text-red-900",
        tone === "neutral" && "border-[var(--border)] bg-white text-[var(--text)]",
      )}
    >
      <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
      {children}
    </div>
  );
}

export function UiMobileNavigation({ children }: { children: ReactNode }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-14px_34px_rgba(25,25,25,0.1)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">{children}</div>
    </nav>
  );
}

export function UiSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-white/86 p-4 lg:block">
      {children}
    </aside>
  );
}
