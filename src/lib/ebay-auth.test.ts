import { describe, it, expect, afterEach } from "vitest";
import { getEbayAuthUrl } from "./ebay-auth";

describe("getEbayAuthUrl", () => {
  const originalClientId = process.env.EBAY_CLIENT_ID;
  const originalRedirectUri = process.env.EBAY_REDIRECT_URI;
  const originalEnvironment = process.env.EBAY_ENVIRONMENT;

  afterEach(() => {
    process.env.EBAY_CLIENT_ID = originalClientId;
    process.env.EBAY_REDIRECT_URI = originalRedirectUri;
    process.env.EBAY_ENVIRONMENT = originalEnvironment;
  });

  it("throws when EBAY_CLIENT_ID is missing", () => {
    process.env.EBAY_CLIENT_ID = "";
    process.env.EBAY_REDIRECT_URI = "https://app.example.com/callback";
    expect(() => getEbayAuthUrl()).toThrow("EBAY_CLIENT_ID and EBAY_REDIRECT_URI must be set");
  });

  it("throws when EBAY_REDIRECT_URI is missing", () => {
    process.env.EBAY_CLIENT_ID = "test-client-id";
    process.env.EBAY_REDIRECT_URI = "";
    expect(() => getEbayAuthUrl()).toThrow("EBAY_CLIENT_ID and EBAY_REDIRECT_URI must be set");
  });

  it("returns URL containing redirect_uri and client_id when env is set", () => {
    process.env.EBAY_CLIENT_ID = "test-client-id";
    process.env.EBAY_REDIRECT_URI = "https://app.example.com/callback";
    process.env.EBAY_ENVIRONMENT = "production";
    const url = getEbayAuthUrl();
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("https%3A%2F%2Fapp.example.com%2Fcallback");
    expect(url).toContain("client_id=test-client-id");
  });

  it("uses sandbox auth host when EBAY_ENVIRONMENT is sandbox", () => {
    process.env.EBAY_CLIENT_ID = "test-client-id";
    process.env.EBAY_REDIRECT_URI = "https://app.example.com/callback";
    process.env.EBAY_ENVIRONMENT = "sandbox";
    const url = getEbayAuthUrl();
    expect(url).toMatch(/^https:\/\/auth\.sandbox\.ebay\.com/);
  });

  it("uses production auth host when EBAY_ENVIRONMENT is production", () => {
    process.env.EBAY_CLIENT_ID = "test-client-id";
    process.env.EBAY_REDIRECT_URI = "https://app.example.com/callback";
    process.env.EBAY_ENVIRONMENT = "production";
    const url = getEbayAuthUrl();
    expect(url).toMatch(/^https:\/\/auth\.ebay\.com/);
  });
});
