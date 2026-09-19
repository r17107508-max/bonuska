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
