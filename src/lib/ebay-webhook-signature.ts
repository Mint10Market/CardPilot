/**
 * Verify X-EBAY-SIGNATURE on eBay push notifications (e.g. Marketplace Account Deletion).
 * Uses ECDSA with SHA1; public key fetched from Notification API and cached.
 */

import { createVerify } from "crypto";
import { getEbayClientCredentialsToken } from "./ebay-auth";

const NOTIFICATION_BASE = "https://api.ebay.com/commerce/notification/v1";
const NOTIFICATION_SANDBOX_BASE = "https://api.sandbox.ebay.com/commerce/notification/v1";

function getNotificationBase(): string {
  return process.env.EBAY_ENVIRONMENT === "sandbox"
    ? NOTIFICATION_SANDBOX_BASE
    : NOTIFICATION_BASE;
}

type XEbaySignature = {
  alg?: string;
  kid?: string;
  signature?: string;
  digest?: string;
};

const publicKeyCache = new Map<
  string,
  { key: string; algorithm: string; digest: string; expiresAt: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchPublicKey(kid: string): Promise<{ key: string; algorithm: string; digest: string }> {
  const cached = publicKeyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) {
    return { key: cached.key, algorithm: cached.algorithm, digest: cached.digest };
  }
  const token = await getEbayClientCredentialsToken();
  const base = getNotificationBase();
  const res = await fetch(`${base}/public_key/${encodeURIComponent(kid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay getPublicKey failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { key?: string; algorithm?: string; digest?: string };
  if (!data.key) throw new Error("eBay getPublicKey missing key");
  const entry = {
    key: data.key,
    algorithm: data.algorithm ?? "ECDSA",
    digest: data.digest ?? "SHA1",
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  publicKeyCache.set(kid, entry);
  return { key: entry.key, algorithm: entry.algorithm, digest: entry.digest };
}

/**
 * Verify the X-EBAY-SIGNATURE header against the raw notification body.
 * Returns true if the signature is valid; false or throws otherwise.
 */
export async function verifyEbayWebhookSignature(
  signatureHeader: string | null,
  rawBody: string
): Promise<boolean> {
  if (!signatureHeader?.trim()) return false;
  let decoded: XEbaySignature;
  try {
    const json = Buffer.from(signatureHeader, "base64").toString("utf8");
    decoded = JSON.parse(json) as XEbaySignature;
  } catch {
    return false;
  }
  const kid = decoded.kid;
  const signatureB64 = decoded.signature;
  if (!kid || !signatureB64) return false;

  const { key: pem, digest } = await fetchPublicKey(kid);
  // eBay uses ECDSA with SHA1
  const algo = digest.toUpperCase() === "SHA1" ? "sha1" : "sha256";
  const verify = createVerify(algo);
  verify.update(rawBody, "utf8");
  verify.end();

  let signatureBuf: Buffer;
  try {
    signatureBuf = Buffer.from(signatureB64, "base64");
  } catch {
    return false;
  }

  try {
    return verify.verify(pem, signatureBuf);
  } catch {
    return false;
  }
}
