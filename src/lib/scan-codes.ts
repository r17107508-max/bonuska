export const MANUAL_SCAN_CODE_LENGTH = 8;

export type ManualScanCodeType = "customer" | "reward";

const codePrefixes: Record<ManualScanCodeType, string> = {
  customer: "C",
  reward: "R",
};

export function buildManualScanCode(token: string, type: ManualScanCodeType = "customer") {
  const normalized = token.trim().replace(/^[^:]+:/, "").replace(/^[^:]+:/, "");
  const compact = normalized.replace(/[^a-z0-9]/gi, "").slice(0, MANUAL_SCAN_CODE_LENGTH).toUpperCase();

  return `${codePrefixes[type]}-${compact}`;
}

export function parseManualScanCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([CR])-?([A-Z0-9]{8})$/);

  if (!match) {
    return null;
  }

  return {
    type: match[1] === "R" ? ("reward" as const) : ("customer" as const),
    prefix: match[2].toLowerCase(),
  };
}

export function looksLikeManualScanCode(value: string) {
  return Boolean(parseManualScanCode(value));
}
