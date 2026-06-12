import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

const DYNAMIC_QR_TTL_SECONDS = 75;
const secret = createHash("sha256")
  .update(process.env.AUTH_SECRET ?? "replace-this-local-secret-before-production")
  .digest();

export function buildDynamicQrPayload(token: string) {
  return `proplushki:session:${token}`;
}

export async function createDynamicCustomerQr(userId: string) {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + DYNAMIC_QR_TTL_SECONDS;
  const token = await new EncryptJWT({ qrType: "customer" })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAtSeconds)
    .encrypt(secret);

  return {
    payload: buildDynamicQrPayload(token),
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    ttlSeconds: DYNAMIC_QR_TTL_SECONDS,
  };
}

export async function verifyDynamicCustomerQr(token: string) {
  try {
    const { payload } = await jwtDecrypt(token, secret);
    if (payload.qrType !== "customer" || typeof payload.sub !== "string") {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}
