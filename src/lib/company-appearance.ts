import type { CSSProperties } from "react";

export const cardFontOptions = [
  { value: "SYSTEM", label: "Современный системный" },
  { value: "ROUNDED", label: "Мягкий округлый" },
  { value: "SERIF", label: "Классический с засечками" },
  { value: "MONO", label: "Лаконичный моноширинный" },
] as const;

export type CardFontFamily = (typeof cardFontOptions)[number]["value"];

export function normalizeCardFontFamily(value: FormDataEntryValue | string | null | undefined): CardFontFamily {
  const candidate = String(value ?? "").trim().toUpperCase();
  return cardFontOptions.some((option) => option.value === candidate)
    ? candidate as CardFontFamily
    : "SYSTEM";
}

export function cardFontStack(value: string | null | undefined) {
  switch (normalizeCardFontFamily(value)) {
    case "ROUNDED":
      return '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';
    case "SERIF":
      return 'Georgia, "Times New Roman", serif';
    case "MONO":
      return 'ui-monospace, "Cascadia Code", "Courier New", monospace';
    default:
      return 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }
}

type CardAppearanceStyle = CSSProperties & {
  "--background": string;
  "--surface": string;
  "--text": string;
  "--text-muted": string;
  "--border": string;
  "--inactive": string;
  "--brand": string;
  "--brand-strong": string;
  "--brand-soft": string;
};

export function normalizeCardColor(value: string | null | undefined, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function cardAppearanceStyle({
  themeColor,
  surfaceColor,
  textColor,
  fontFamily,
}: {
  themeColor?: string | null;
  surfaceColor?: string | null;
  textColor?: string | null;
  fontFamily?: string | null;
}): CardAppearanceStyle {
  const brand = normalizeCardColor(themeColor, "#C94726");
  const surface = normalizeCardColor(surfaceColor, "#FFFFFF");
  const text = normalizeCardColor(textColor, "#1F1B18");

  return {
    fontFamily: cardFontStack(fontFamily),
    color: text,
    "--background": surface,
    "--surface": surface,
    "--text": text,
    "--text-muted": colorWithAlpha(text, 0.76),
    "--border": colorWithAlpha(text, 0.2),
    "--inactive": colorWithAlpha(text, 0.08),
    "--brand": brand,
    "--brand-strong": brand,
    "--brand-soft": colorWithAlpha(brand, 0.18),
  };
}

function colorWithAlpha(color: string, alpha: number) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
