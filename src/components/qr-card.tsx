import QRCode from "qrcode";
import { CustomerQrActions } from "@/components/customer-qr-actions";
import { buildGlobalQrPayload, buildQrPayload, buildRewardQrPayload } from "@/lib/loyalty";
import { buildManualScanCode } from "@/lib/scan-codes";

export async function QrCard({
  token,
  color = "#FF6A3D",
  companyName = "loyalty",
  mode = "membership",
}: {
  token: string;
  color?: string;
  companyName?: string;
  mode?: "membership" | "global" | "reward";
}) {
  const payload =
    mode === "global" ? buildGlobalQrPayload(token) : mode === "reward" ? buildRewardQrPayload(token) : buildQrPayload(token);
  const manualCode = buildManualScanCode(token, mode === "reward" ? "reward" : "customer");
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 360,
    color: {
      dark: color,
      light: "#ffffff",
    },
  });

  return (
    <section className="warm-card p-4 text-center">
      <div className="mx-auto flex max-w-64 items-center justify-center rounded-lg bg-white p-3 shadow-inner ring-1 ring-[var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={mode === "reward" ? "QR-код подарка" : "Личный QR-код клиента"} />
      </div>
      <p className="mt-3 text-base font-semibold text-[var(--text)]">
        {mode === "global" ? "Мой QR" : mode === "reward" ? "QR подарка" : "QR на кассе"}
      </p>
      <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
        {mode === "global"
          ? "Покажите кассиру."
          : mode === "reward"
            ? "Для получения подарка."
            : "Для начисления покупки."}
      </p>
      <div className="mt-3 rounded-lg bg-white p-3 text-center ring-1 ring-[var(--border)]">
        <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Код для ручного ввода</p>
        <p className="mt-1 font-mono text-xl font-semibold tracking-normal text-[var(--text)]">{manualCode}</p>
      </div>
      <CustomerQrActions qrDataUrl={qrDataUrl} companyName={companyName} />
    </section>
  );
}
