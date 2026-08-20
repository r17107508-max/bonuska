import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, MapPinned, QrCode, Store } from "lucide-react";
import { clsx } from "clsx";

export function ClientShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={clsx("min-h-screen bg-[var(--background)] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--text)]", className)}>
      <section className="mx-auto w-full max-w-md space-y-4 md:max-w-3xl lg:max-w-5xl">{children}</section>
    </main>
  );
}

export function ClientCard({
  children,
  className,
  id,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  return <section id={id} style={style} className={clsx("rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm", className)}>{children}</section>;
}

export function ClientEmptyState({
  image,
  alt,
  title,
  text,
  actionHref,
  actionLabel,
}: {
  image: "client-first-card" | "client-reward-unlocked" | "client-empty-rewards" | "client-empty-history";
  alt: string;
  title: string;
  text?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <ClientCard className="text-center">
      <Image
        src={`/images/client/${image}.webp`}
        alt={alt}
        width={220}
        height={220}
        loading="lazy"
        className="mx-auto h-auto w-[180px] sm:w-[220px]"
      />
      <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[var(--text)]">{title}</h2>
      {text && <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white">
          {actionLabel}
        </Link>
      )}
    </ClientCard>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "warning" }) {
  const color = tone === "success" ? "bg-[var(--success)]" : tone === "warning" ? "bg-[var(--gold)]" : "bg-[var(--brand-strong)]";
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[var(--inactive)]">
      <div className={clsx("h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ProgramProgressDots({
  current,
  goal,
  icon,
  rewardAvailable,
}: {
  current: number;
  goal: number;
  icon: string;
  rewardAvailable?: boolean;
}) {
  const visibleGoal = Math.min(Math.max(goal, 1), 10);
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {Array.from({ length: visibleGoal }).map((_, index) => {
        const filled = rewardAvailable || index < current;
        return (
          <span
            key={index}
            className={clsx(
              "flex aspect-square min-h-10 items-center justify-center rounded-2xl text-sm font-black",
              filled ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "border border-dashed border-[var(--border)] bg-white text-[var(--text-muted)]",
            )}
            aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
          >
            {filled ? icon : index + 1}
          </span>
        );
      })}
    </div>
  );
}

export function ProgramSummaryCard({
  href,
  companyName,
  businessType,
  logoUrl,
  icon,
  rewardTitle,
  current,
  goal,
  left,
  address,
  rewardAvailable,
  themeColor,
  cardBackgroundUrl,
  cardBackgroundMode,
  cardSurfaceColor,
  cardTextColor,
}: {
  href: string;
  companyName: string;
  businessType: string;
  logoUrl?: string | null;
  icon: string;
  rewardTitle: string;
  current: number;
  goal: number;
  left: number;
  address?: string | null;
  rewardAvailable?: boolean;
  themeColor?: string | null;
  cardBackgroundUrl?: string | null;
  cardBackgroundMode?: string | null;
  cardSurfaceColor?: string | null;
  cardTextColor?: string | null;
}) {
  const progress = rewardAvailable ? 100 : Math.round((current / Math.max(goal, 1)) * 100);
  const safeColor = readableThemeColor(themeColor);
  const hasPhotoBackground = cardBackgroundMode === "PHOTO" && Boolean(cardBackgroundUrl);

  return (
    <Link
      href={href}
      className={clsx(
        "block overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm transition active:scale-[0.99] motion-reduce:transition-none",
        hasPhotoBackground ? "bg-cover bg-center p-3" : "p-4",
      )}
      style={hasPhotoBackground ? { backgroundImage: `url(${cardBackgroundUrl})` } : undefined}
    >
      <div
        className={clsx(hasPhotoBackground && "rounded-3xl p-4 backdrop-blur-[2px]")}
        style={
          hasPhotoBackground
            ? {
                backgroundColor: cardSurfaceColor ?? "rgba(255,255,255,0.9)",
                color: cardTextColor ?? "#1F1B18",
              }
            : undefined
        }
      >
      <div className="flex items-start gap-3">
        <LogoBox logoUrl={logoUrl} fallback={icon} name={companyName} color={safeColor} />
        <div className="min-w-0 flex-1">
          <p className={clsx("truncate text-lg font-extrabold", hasPhotoBackground ? "" : "text-[var(--text)]")}>{companyName}</p>
          <p className={clsx("mt-0.5 text-sm font-semibold", hasPhotoBackground ? "opacity-75" : "text-[var(--text-muted)]")}>{businessType}</p>
        </div>
        <ArrowRight aria-hidden className="mt-2 size-5 shrink-0 text-[var(--text-muted)]" />
      </div>
      <p className={clsx("mt-4 text-sm font-bold", hasPhotoBackground ? "" : "text-[var(--text)]")}>{rewardTitle}</p>
      <p className={clsx("mt-1 text-sm", hasPhotoBackground ? "opacity-75" : "text-[var(--text-muted)]")}>
        {rewardAvailable ? "Подарок готов" : pluralPurchasesLeft(left)}
      </p>
      <div className="mt-3">
        <ProgressBar value={progress} tone={rewardAvailable ? "warning" : "brand"} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-[var(--text-muted)]">{current} из {goal}</span>
        {address && <span className="inline-flex min-w-0 items-center gap-1 text-[var(--text-muted)]"><MapPinned aria-hidden className="size-4 shrink-0" /><span className="truncate">{address}</span></span>}
      </div>
      </div>
    </Link>
  );
}

export function LogoBox({
  logoUrl,
  fallback,
  name,
  color,
  className,
}: {
  logoUrl?: string | null;
  fallback: string;
  name: string;
  color?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // Remote partner logos are user data and are not restricted in next/image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={`Логотип ${name}`} className={clsx("size-12 shrink-0 rounded-2xl border border-[var(--border)] bg-white object-cover", className)} />
    );
  }

  return (
    <span
      className={clsx("flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white", className)}
      style={{ backgroundColor: color ?? "var(--brand-strong)" }}
      aria-hidden
    >
      {fallback}
    </span>
  );
}

export function QuickQrButton({ href = "/app/qr", label = "Показать QR" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white">
      <QrCode aria-hidden className="size-5" />
      {label}
    </Link>
  );
}

export function RouteButton({ address }: { address: string }) {
  return (
    <a
      href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-extrabold text-[var(--text)]"
    >
      <MapPinned aria-hidden className="size-5" />
      Маршрут
    </a>
  );
}

export function PartnerBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-8 items-center rounded-full bg-[var(--brand-soft)] px-3 text-xs font-extrabold text-[var(--brand-strong)]">{children}</span>;
}

export function pluralPurchasesLeft(left: number) {
  if (left <= 0) return "Подарок доступен";
  const mod10 = left % 10;
  const mod100 = left % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "покупка" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "покупки" : "покупок";
  return `До подарка осталось ${left} ${word}`;
}

export function readableThemeColor(color: string | null | undefined) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return "#C94726";
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#C94726" : color;
}

export const clientOperationLabels = {
  PURCHASE: "Покупка начислена",
  LEVEL_UP: "Новый уровень",
  REWARD_OPENED: "Подарок открыт",
  REWARD_REDEEMED: "Подарок выдан",
  REWARD_GRANTED: "Подарок выдан",
  MANUAL_ADJUSTMENT: "Корректировка",
} as const;

export const clientOperationIcons = {
  PURCHASE: Store,
  LEVEL_UP: Gift,
  REWARD_OPENED: Gift,
  REWARD_REDEEMED: Gift,
  REWARD_GRANTED: Gift,
  MANUAL_ADJUSTMENT: Gift,
} as const;
