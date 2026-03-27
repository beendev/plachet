import crypto, { timingSafeEqual } from "crypto";
import { getServerEnv } from "../env";

export const OWNER_APPROVAL_PENDING_STATUSES = new Set(["validation_proprietaire", "en_attente_validation"]);

const getApprovalSigningSecret = () =>
  getServerEnv().supabaseServiceRoleKey || process.env.RESEND_API_KEY || "plachet-owner-approval";

export const createOwnerApprovalToken = (orderId: number | string, ownerEmail: string) => {
  const payload = Buffer.from(JSON.stringify({
    orderId: String(orderId),
    ownerEmail: ownerEmail.toLowerCase().trim(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getApprovalSigningSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

export const verifyOwnerApprovalToken = (token: string) => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Lien invalide");

  const expectedSignature = crypto
    .createHmac("sha256", getApprovalSigningSecret())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSignature, "base64url");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Lien invalide");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!decoded.exp || decoded.exp < Date.now()) throw new Error("Lien expiré");
  return decoded as { orderId: string; ownerEmail: string; exp: number };
};
