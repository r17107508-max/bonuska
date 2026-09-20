import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fileNamePattern = /^[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/;
const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!fileNamePattern.test(filename) || path.basename(filename) !== filename) {
    return new Response("Изображение не найдено", { status: 404 });
  }

  const candidates = [
    path.join(process.cwd(), "storage", "company-design", filename),
    path.join(process.cwd(), "public", "uploads", "company-design", filename),
  ];

  for (const filePath of candidates) {
    try {
      const file = await readFile(/* turbopackIgnore: true */ filePath);
      const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
      return new Response(new Uint8Array(file), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(file.byteLength),
          "Content-Type": contentTypes[extension] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "ENOENT") {
        console.error("Не удалось отдать изображение компании", { filename, code });
        return new Response("Не удалось загрузить изображение", { status: 500 });
      }
    }
  }

  return new Response("Изображение не найдено", { status: 404 });
}
