"use client";

import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CompanyLogoUpload({
  companyName,
  defaultLogoUrl,
}: {
  companyName: string;
  defaultLogoUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState(defaultLogoUrl ?? "");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [error, setError] = useState("");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-sm font-bold text-[var(--text)]">Логотип</p>
      <div className="mt-3 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        {!removeLogo && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Предпросмотр логотипа ${companyName}`}
            className="h-full w-full object-contain p-4"
            onError={() => {
              if (!objectUrlRef.current) setPreviewUrl("");
            }}
          />
        ) : (
          <span className="px-4 text-center text-sm font-semibold text-[var(--text-muted)]">Логотип не выбран</span>
        )}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Загрузить логотип</span>
        <input
          name="logoImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[var(--brand-strong)]"
          onChange={(event) => {
            const selected = event.currentTarget.files?.[0] ?? null;
            setError("");
            if (!selected) {
              setSelectedFileName("");
              if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = null;
              setPreviewUrl(defaultLogoUrl ?? "");
              return;
            }
            if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
              setSelectedFileName("");
              setError("Выберите файл JPG, PNG или WebP. HEIC, SVG и GIF не поддерживаются.");
              event.currentTarget.value = "";
              return;
            }
            if (selected.size > MAX_IMAGE_BYTES) {
              setSelectedFileName("");
              setError("Размер логотипа превышает 2 МБ.");
              event.currentTarget.value = "";
              return;
            }
            setRemoveLogo(false);
            setSelectedFileName(selected.name);
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = URL.createObjectURL(selected);
            setPreviewUrl(objectUrlRef.current);
          }}
        />
      </label>
      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
        Формат: JPG, PNG или WebP, до 2 МБ. Рекомендуемый размер — квадрат 512×512 px. Для прозрачного фона используйте PNG или WebP.
      </p>
      {selectedFileName && <p className="mt-1 text-xs font-bold text-[var(--success)]">Выбран файл: {selectedFileName}</p>}
      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-[var(--danger)]">{error}</p>}

      {defaultLogoUrl && (
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--text)]">
          <input
            name="removeLogo"
            type="checkbox"
            checked={removeLogo}
            onChange={(event) => setRemoveLogo(event.currentTarget.checked)}
            className="size-4 accent-[var(--brand-strong)]"
          />
          Удалить текущий логотип
        </label>
      )}
    </div>
  );
}
