"use client";

import { useEffect, useRef, useState } from "react";
import { cardFontOptions, cardFontStack, normalizeCardFontFamily } from "@/lib/company-appearance";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CompanyAppearanceSettings({
  companyName,
  rewardTitle,
  rewardDescription,
  goalCount,
  icons,
  defaultIcon,
  defaultThemeColor,
  defaultBackgroundMode,
  defaultBackgroundUrl,
  defaultSurfaceColor,
  defaultTextColor,
  defaultFontFamily,
}: {
  companyName: string;
  rewardTitle: string;
  rewardDescription: string;
  goalCount: number;
  icons: { value: string; label: string }[];
  defaultIcon: string;
  defaultThemeColor: string;
  defaultBackgroundMode: string;
  defaultBackgroundUrl?: string | null;
  defaultSurfaceColor?: string | null;
  defaultTextColor?: string | null;
  defaultFontFamily?: string | null;
}) {
  const [themeColor, setThemeColor] = useState(defaultThemeColor);
  const [icon, setIcon] = useState(defaultIcon);
  const [backgroundMode, setBackgroundMode] = useState(defaultBackgroundMode === "PHOTO" ? "PHOTO" : "SOLID");
  const [backgroundUrl, setBackgroundUrl] = useState(defaultBackgroundUrl ?? "");
  const [backgroundPreview, setBackgroundPreview] = useState(defaultBackgroundUrl ?? "");
  const [surfaceColor, setSurfaceColor] = useState(defaultSurfaceColor ?? "#FFFFFF");
  const [textColor, setTextColor] = useState(defaultTextColor ?? "#1F1B18");
  const [fontFamily, setFontFamily] = useState(normalizeCardFontFamily(defaultFontFamily));
  const [removeBackground, setRemoveBackground] = useState(false);
  const [error, setError] = useState("");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const hasPhoto = backgroundMode === "PHOTO" && !removeBackground && Boolean(backgroundPreview || backgroundUrl);
  const previewImage = backgroundPreview || backgroundUrl;

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField label="Фирменный цвет" name="themeColor" value={themeColor} onChange={setThemeColor} />

        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-600">Иконка прогресса</span>
          <select name="icon" value={icon} onChange={(event) => setIcon(event.currentTarget.value)} className={fieldClassName}>
            {icons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-600">Фон клиентской карточки</span>
          <select
            name="cardBackgroundMode"
            value={backgroundMode}
            onChange={(event) => setBackgroundMode(event.currentTarget.value)}
            className={fieldClassName}
          >
            <option value="SOLID">Спокойный цвет</option>
            <option value="PHOTO">Фото или картинка</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-600">Шрифт клиентской карточки</span>
          <select
            name="cardFontFamily"
            value={fontFamily}
            onChange={(event) => setFontFamily(normalizeCardFontFamily(event.currentTarget.value))}
            className={fieldClassName}
          >
            {cardFontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <ColorField label="Цвет подложки под текстом" name="cardSurfaceColor" value={surfaceColor} onChange={setSurfaceColor} />
        <ColorField label="Цвет текста на карточке" name="cardTextColor" value={textColor} onChange={setTextColor} />

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-slate-600">Ссылка на фоновое изображение — необязательно</span>
          <input
            name="cardBackgroundUrl"
            value={backgroundUrl}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setBackgroundUrl(value);
              if (!objectUrlRef.current) setBackgroundPreview(value);
            }}
            placeholder="https://example.ru/background.jpg"
            className={fieldClassName}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Загрузить свой фон</span>
          <input
            name="cardBackgroundImage"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[var(--brand-strong)]"
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0] ?? null;
              setError("");
              if (!selected) {
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
                setBackgroundPreview(backgroundUrl || defaultBackgroundUrl || "");
                return;
              }
              if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
                setError("Выберите фон JPG, PNG или WebP. HEIC, SVG и GIF не поддерживаются.");
                event.currentTarget.value = "";
                return;
              }
              if (selected.size > MAX_IMAGE_BYTES) {
                setError("Размер фонового изображения превышает 2 МБ.");
                event.currentTarget.value = "";
                return;
              }
              setRemoveBackground(false);
              setBackgroundMode("PHOTO");
              if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = URL.createObjectURL(selected);
              setBackgroundPreview(objectUrlRef.current);
            }}
          />
          <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--text-muted)]">
            Формат: JPG, PNG или WebP, до 2 МБ. Рекомендуемый размер — 1600×900 px или больше, горизонтальная ориентация. HEIC с iPhone сначала сохраните как JPG.
          </span>
        </label>
        {error && <p className="rounded-lg bg-red-50 p-2 text-xs font-bold text-[var(--danger)] sm:col-span-2">{error}</p>}

        {defaultBackgroundUrl && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--text)] sm:col-span-2">
            <input
              name="removeCardBackground"
              type="checkbox"
              checked={removeBackground}
              onChange={(event) => setRemoveBackground(event.currentTarget.checked)}
              className="size-4 accent-[var(--brand-strong)]"
            />
            Удалить загруженный фон
          </label>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900 sm:col-span-2">
          Название компании меняется в разделе «Компания». Название подарка и текст акции меняются в разделе «Программа лояльности». Ниже показан предпросмотр сохранённых надписей с выбранными цветами, шрифтом и фоном.
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase text-[var(--text-muted)]">Предпросмотр клиентской карточки</p>
        <div
          className="overflow-hidden rounded-2xl bg-cover bg-center p-4"
          style={{
            backgroundColor: themeColor,
            backgroundImage: hasPhoto ? `url(${previewImage})` : undefined,
            fontFamily: cardFontStack(fontFamily),
          }}
        >
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: hasPhoto ? surfaceColor : "rgba(255,255,255,0.94)",
              color: textColor,
            }}
          >
            <p className="text-sm font-bold opacity-90">{companyName}</p>
            <p className="mt-3 text-3xl">{icon}</p>
            <h3 className="mt-3 text-xl font-extrabold">{rewardTitle || "Название акции"}</h3>
            <p className="mt-1 text-sm opacity-90">{rewardDescription || "Краткий текст акции"}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {Array.from({ length: Math.min(Math.max(Number(goalCount) || 6, 3), 12) }).map((_, index) => (
            <span key={index} className="aspect-square rounded-full border border-[var(--border)] bg-[var(--background)] text-center text-sm leading-9 text-[var(--text-muted)]">
              {icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const fieldClassName = "mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]";

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-600">{label}</span>
      <div className="mt-1.5 flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2">
        <input name={name} type="color" value={value} onChange={(event) => onChange(event.currentTarget.value)} className="h-8 w-12 cursor-pointer border-0 bg-transparent p-0" />
        <span className="text-sm font-semibold uppercase text-slate-700">{value}</span>
      </div>
    </label>
  );
}
