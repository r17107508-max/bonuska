import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";

export function WorkspaceCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return <section id={id} className={clsx("panel scroll-mt-24 p-4 sm:p-5", className)}>{children}</section>;
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="text-sm font-semibold text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold leading-none text-[var(--text)]">{value}</p>
      {hint && <p className="mt-2 text-sm text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function EmptyCompanyState({
  image,
  alt,
  title,
  text,
  actionHref,
  actionLabel,
}: {
  image: "company-onboarding" | "empty-clients" | "empty-analytics" | "empty-raffles";
  alt: string;
  title: string;
  text?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="panel grid gap-5 p-5 text-center sm:p-6 md:grid-cols-[220px_1fr] md:text-left">
      <Image
        src={`/images/company/${image}.webp`}
        alt={alt}
        width={220}
        height={220}
        loading="lazy"
        className="mx-auto h-auto w-[180px] md:w-[220px]"
      />
      <div className="flex flex-col justify-center">
        <h2 className="text-2xl font-extrabold text-[var(--text)]">{title}</h2>
        {text && <p className="mt-2 text-[var(--text-muted)]">{text}</p>}
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white md:w-fit"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  const styles = {
    neutral: "bg-[var(--inactive)] text-[var(--text-muted)]",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-red-50 text-[var(--danger)]",
    brand: "bg-[var(--brand-soft)] text-[var(--brand-strong)]",
  };

  return <span className={clsx("inline-flex min-h-7 items-center rounded-full px-3 text-xs font-extrabold", styles[tone])}>{children}</span>;
}

export function SegmentedLinks({
  items,
  active,
}: {
  items: { href: string; label: string; value: string }[];
  active: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-white p-1">
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          className={clsx(
            "inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-bold",
            active === item.value ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "text-[var(--text-muted)] hover:bg-[var(--inactive)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function SimpleBars({
  points,
  leftLabel,
  rightLabel,
}: {
  points: { label: string; purchases: number; rewards: number }[];
  leftLabel?: string;
  rightLabel?: string;
}) {
  const max = Math.max(...points.map((point) => point.purchases + point.rewards), 1);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex min-h-[190px] items-end gap-2">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full max-w-8 items-end justify-center gap-1">
              <span
                aria-label={`${point.label}: покупок ${point.purchases}`}
                className="block w-3 rounded-t bg-[var(--brand-strong)]"
                style={{ height: `${Math.max((point.purchases / max) * 100, point.purchases ? 8 : 0)}%` }}
              />
              <span
                aria-label={`${point.label}: подарков ${point.rewards}`}
                className="block w-3 rounded-t bg-[var(--success)]"
                style={{ height: `${Math.max((point.rewards / max) * 100, point.rewards ? 8 : 0)}%` }}
              />
            </div>
            <span className="max-w-full truncate text-[11px] font-semibold text-[var(--text-muted)]">{point.label}</span>
          </div>
        ))}
      </div>
      {(leftLabel || rightLabel) && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[var(--text-muted)]">
          {leftLabel && <span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--brand-strong)]" />{leftLabel}</span>}
          {rightLabel && <span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--success)]" />{rightLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function maskPhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) {
    return "Телефон скрыт";
  }

  const normalized = digits.length === 10 ? `7${digits}` : digits;
  return `+${normalized.slice(0, 1)} ${normalized.slice(1, 4)} ***-${normalized.slice(-2)}`;
}
