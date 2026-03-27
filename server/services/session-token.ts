import crypto, { timingSafeEqual } from "crypto";

type SessionPayload = {
  userId: number;
  role: string;
  exp: number;
};

const encode = (value: object) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const decode = (value: string) => JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

export function createSessionToken(
  payload: { userId: number | string; role: string },
  secret: string,
  expiresInSeconds = 60 * 60 * 24 * 7,
) {
  if (!secret) {
    throw new Error("SESSION_SECRET manquant");
  }
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    userId: Number(payload.userId),
    role: String(payload.role || ""),
    exp: now + Math.max(60, Math.floor(expiresInSeconds)),
  };
  const encodedPayload = encode(body);
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string, secret: string) {
  if (!secret) {
    throw new Error("SESSION_SECRET manquant");
  }
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Token invalide");
  }
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSignature, "base64url");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Signature invalide");
  }
  const payload = decode(encodedPayload) as SessionPayload;
  if (!payload?.userId || !payload?.role) {
    throw new Error("Payload invalide");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error("Session expirée");
  }
  return payload;
}

