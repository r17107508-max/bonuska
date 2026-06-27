import QRCode from "qrcode";
import { CustomerQrActions } from "@/components/customer-qr-actions";
import { buildGlobalQrPayload, buildQrPayload, buildRewardQrPayload } from "@/lib/loyalty";
import { buildManualScanCode } from "@/lib/scan-codes";

export async function QrCard({
  token,
  color = "#0f766e",
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
      <div className="mx-auto flex max-w-64 items-center justify-center rounded-lg bg-white p-3 shadow-inner ring-1 ring-amber-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={mode === "reward" ? "QR-код подарка" : "Личный QR-код клиента"} />
      </div>
      <p className="mt-3 text-base font-semibold text-[#2f1d13]">
        {mode === "global" ? "Мой QR" : mode === "reward" ? "QR подарка" : "QR на кассе"}
      </p>
      <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">
        {mode === "global"
          ? "Покажите кассиру."
          : mode === "reward"
            ? "Для получения подарка."
            : "Для начисления покупки."}
      </p>
      <div className="mt-3 rounded-lg bg-white p-3 text-center ring-1 ring-amber-100">
        <p className="text-xs font-semibold uppercase text-[#7b6a5b]">Код для ручного ввода</p>
        <p className="mt-1 font-mono text-xl font-semibold tracking-normal text-[#2f1d13]">{manualCode}</p>
      </div>
      <CustomerQrActions qrDataUrl={qrDataUrl} companyName={companyName} />
    </section>
  );
}
