import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_DESIGN_IMAGE_BYTES = 2 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function cleanHexColor(value: FormDataEntryValue | null, fallback: string | null = null) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export async function saveCompanyDesignImage(companyId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_DESIGN_IMAGE_BYTES) {
    throw new Error("Фоновое изображение должно быть не больше 2 МБ");
  }

  const extension = allowedImageTypes.get(file.type);
  if (!extension) {
    throw new Error("Загрузите фон в формате JPG, PNG или WebP");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "company-design");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${companyId}-${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/company-design/${fileName}`;
}
