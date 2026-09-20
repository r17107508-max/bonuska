"use client";

import { useState } from "react";
import { clsx } from "clsx";

export function CompanyLogo({
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      // Partner logos are uploaded user content and may use local or remote URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Логотип ${name}`}
        className={clsx("size-12 shrink-0 rounded-2xl border border-[var(--border)] bg-white object-contain p-1", className)}
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }

  return (
    <span
      className={clsx("flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white", className)}
      style={{ backgroundColor: color ?? "var(--brand-strong)" }}
      role="img"
      aria-label={`Логотип ${name} не загружен`}
    >
      {fallback}
    </span>
  );
}
