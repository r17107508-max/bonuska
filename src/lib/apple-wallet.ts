import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { buildGlobalQrPayload } from "@/lib/loyalty";

const requiredEnv = [
  "APPLE_WALLET_PASS_TYPE_IDENTIFIER",
  "APPLE_WALLET_TEAM_IDENTIFIER",
  "APPLE_WALLET_CERTIFICATE",
  "APPLE_WALLET_PRIVATE_KEY",
  "APPLE_WALLET_WWDR",
] as const;

type WalletPassUser = {
  id: string;
  name: string;
  globalQrToken: string | null;
};

export function getAppleWalletStatus() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  return {
    enabled: missing.length === 0,
    missing,
  };
}

function normalizeCertificateValue(value: string) {
  const trimmed = value.trim();
  if (existsSync(trimmed)) {
    return readFile(trimmed);
  }

  const normalized = trimmed.includes("-----BEGIN") ? trimmed.replace(/\\n/g, "\n") : Buffer.from(trimmed, "base64");
  return Promise.resolve(normalized);
}

function hexToRgb(color: string, fallback: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export async function createAppleWalletPass(user: WalletPassUser, activeCardsCount: number) {
  const status = getAppleWalletStatus();
  if (!status.enabled) {
    throw new Error(`Apple Wallet не настроен: ${status.missing.join(", ")}`);
  }

  if (!user.globalQrToken) {
    throw new Error("У клиента нет QR-токена");
  }

  const [signerCert, signerKey, wwdr, icon] = await Promise.all([
    normalizeCertificateValue(process.env.APPLE_WALLET_CERTIFICATE!),
    normalizeCertificateValue(process.env.APPLE_WALLET_PRIVATE_KEY!),
    normalizeCertificateValue(process.env.APPLE_WALLET_WWDR!),
    readFile(path.join(process.cwd(), "public", "icons", "icon-192.png")),
  ]);

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_IDENTIFIER!,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_IDENTIFIER!,
    organizationName: process.env.APPLE_WALLET_ORGANIZATION_NAME || "ПроПлюшка",
    description: "QR-карта лояльности ПроПлюшка",
    serialNumber: `customer-${user.id}`,
    logoText: "ПроПлюшка",
    foregroundColor: hexToRgb("#1F1B18", "#1F1B18"),
    backgroundColor: hexToRgb("#FFF9F3", "#FFF9F3"),
    labelColor: hexToRgb("#6F6862", "#6F6862"),
    storeCard: {
      primaryFields: [{ key: "name", label: "Клиент", value: user.name }],
      secondaryFields: [{ key: "cards", label: "Активных программ", value: String(activeCardsCount) }],
      backFields: [
        {
          key: "rules",
          label: "Как использовать",
          value: "Покажите QR кассиру. Начисление и выдача подарков подтверждаются сервером ПроПлюшки.",
        },
        {
          key: "privacy",
          label: "Безопасность",
          value: "QR не содержит номер телефона. Кассир видит только данные, разрешенные ролью и компанией.",
        },
      ],
    },
  };

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      "icon.png": icon,
      "icon@2x.png": icon,
      "logo.png": icon,
      "logo@2x.png": icon,
    },
    {
      signerCert,
      signerKey,
      wwdr,
      signerKeyPassphrase: process.env.APPLE_WALLET_PRIVATE_KEY_PASSPHRASE,
    },
  );

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: buildGlobalQrPayload(user.globalQrToken),
    messageEncoding: "iso-8859-1",
    altText: "ПроПлюшка",
  });

  return pass.getAsBuffer();
}
