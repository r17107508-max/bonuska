import QRCode from "qrcode";
import { CustomerQrActions } from "@/components/customer-qr-actions";
import { buildGlobalQrPayload, buildQrPayload, buildRewardQrPayload } from "@/lib/loyalty";

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
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 360,
    color: {
      dark: color,
      light: "#ffffff",
    },
  });

  return (
    <section className="panel p-5 text-center">
      <div className="mx-auto flex max-w-72 items-center justify-center rounded-lg bg-white p-4 shadow-inner ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={mode === "reward" ? "QR-код подарка" : "Личный QR-код клиента"} />
      </div>
      <p className="mt-4 text-lg font-semibold text-slate-950">
        {mode === "global" ? "Мой QR для всех компаний" : mode === "reward" ? "QR подарка" : "Покажите QR-код на кассе"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {mode === "global"
          ? "Кассир начислит покупку в своей компании. QR не содержит телефон."
          : mode === "reward"
            ? "Покажите этот QR-код кассиру, чтобы получить подарок. Он одноразовый."
            : "QR содержит защищённый токен, а не номер телефона."}
      </p>
      <CustomerQrActions qrDataUrl={qrDataUrl} companyName={companyName} />
      <details className="mt-4 rounded-lg bg-slate-100 p-3 text-left">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Токен для локального теста</summary>
        <p className="mt-2 break-all font-mono text-xs text-slate-600">{payload}</p>
      </details>
    </section>
  );
}
