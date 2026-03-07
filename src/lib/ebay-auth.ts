/**
 * eBay OAuth 2.0 (Authorization Code Grant) and session helpers.
 * No separate app sign-in; identity = linked eBay user.
 */

const EBAY_SANDBOX_AUTH = "https://auth.sandbox.ebay.com/oauth2/authorize";
const EBAY_PROD_AUTH = "https://auth.ebay.com/oauth2/authorize";
const EBAY_SANDBOX_TOKEN = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
const EBAY_PROD_TOKEN = "https://api.ebay.com/identity/v1/oauth2/token";

// Scopes: identity (user id), Sell API fulfillment, inventory, account.
const DEFAULT_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
].join(" ");

function isSandbox() {
  return process.env.EBAY_ENVIRONMENT === "sandbox";
}

export function getEbayAuthUrl(state?: string): string {
  const clientId = process.env.EBAY_CLIENT_ID;
  const redirectUri = process.env.EBAY_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error("EBAY_CLIENT_ID and EBAY_REDIRECT_URI must be set");
  const base = isSandbox() ? EBAY_SANDBOX_AUTH : EBAY_PROD_AUTH;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPES,
    ...(state && { state }),
  });
  return `${base}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set");
  const tokenUrl = isSandbox() ? EBAY_SANDBOX_TOKEN : EBAY_PROD_TOKEN;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay token exchange failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return data;
}

export async function refreshEbayAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set");
  const tokenUrl = isSandbox() ? EBAY_SANDBOX_TOKEN : EBAY_PROD_TOKEN;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay token refresh failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data;
}

export function getTokenEndpoint(): string {
  return isSandbox() ? EBAY_SANDBOX_TOKEN : EBAY_PROD_TOKEN;
}

/** Client credentials grant for app-only APIs (e.g. Notification API getPublicKey). */
const NOTIFICATION_SCOPE = "https://api.ebay.com/oauth/api_scope";

export async function getEbayClientCredentialsToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set");
  const tokenUrl = isSandbox() ? EBAY_SANDBOX_TOKEN : EBAY_PROD_TOKEN;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: NOTIFICATION_SCOPE,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay client credentials failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

const EBAY_SANDBOX_IDENTITY = "https://apiz.sandbox.ebay.com/commerce/identity/v1/user/";
const EBAY_PROD_IDENTITY = "https://apiz.ebay.com/commerce/identity/v1/user/";

export async function getEbayUser(accessToken: string): Promise<{ userId: string; username?: string }> {
  const url = isSandbox() ? EBAY_SANDBOX_IDENTITY : EBAY_PROD_IDENTITY;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`eBay get user failed: ${res.status}`);
  const data = (await res.json()) as { userId?: string; username?: string };
  if (!data.userId) throw new Error("eBay user response missing userId");
  return { userId: data.userId, username: data.username };
}
