import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_DESIGN_IMAGE_BYTES = 2 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type CompanyDesignImageKind = "logo" | "background";

export function cleanHexColor(value: FormDataEntryValue | null, fallback: string | null = null) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function normalizeCompanyImageUrl(value: FormDataEntryValue | null) {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (url.startsWith("/uploads/company-design/")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  throw new Error("Укажите полный адрес изображения, начинающийся с https://");
}

export async function saveCompanyDesignImage(
  companyId: string,
  file: FormDataEntryValue | null,
  kind: CompanyDesignImageKind,
) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_DESIGN_IMAGE_BYTES) {
    throw new Error(`${kind === "logo" ? "Логотип" : "Фоновое изображение"} должен быть не больше 2 МБ`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  const declaredExtension = allowedImageTypes.get(file.type);
  if (!detectedType || (declaredExtension && declaredExtension !== detectedType)) {
    throw new Error(`Загрузите ${kind === "logo" ? "логотип" : "фон"} в формате JPG, PNG или WebP`);
  }

  const uploadsDir = path.join(process.cwd(), "storage", "company-design");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${companyId}-${kind}-${Date.now()}-${randomBytes(6).toString("hex")}.${detectedType}`;
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/company-design/${fileName}`;
}

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }

  return null;
}
