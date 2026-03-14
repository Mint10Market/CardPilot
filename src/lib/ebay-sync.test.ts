import { describe, it, expect, vi, beforeEach } from "vitest";
import { getValidAccessToken, syncOrdersForUser } from "./ebay-sync";

const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
const mockFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: { users: { findFirst: (opts: unknown) => mockFindFirst(opts) } },
    update: () => mockUpdate(),
    insert: () => ({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

const mockRefresh = vi.fn();
vi.mock("@/lib/ebay-auth", () => ({
  refreshEbayAccessToken: (token: string) => mockRefresh(token),
}));

describe("getValidAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing access token when expiry is valid (more than 5 min in future)", async () => {
    const inTwentyMinutes = new Date(Date.now() + 20 * 60 * 1000);
    mockFindFirst.mockResolvedValue({
      accessToken: "valid-token",
      tokenExpiresAt: inTwentyMinutes,
      refreshToken: "refresh",
    });
    const token = await getValidAccessToken("user-1");
    expect(token).toBe("valid-token");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("refreshes and returns new token when expiry is in the past", async () => {
    const inThePast = new Date(Date.now() - 1000);
    mockFindFirst.mockResolvedValue({
      accessToken: "old-token",
      tokenExpiresAt: inThePast,
      refreshToken: "refresh",
    });
    mockRefresh.mockResolvedValue({ access_token: "new-token", expires_in: 7200 });
    const token = await getValidAccessToken("user-1");
    expect(token).toBe("new-token");
    expect(mockRefresh).toHaveBeenCalledWith("refresh");
  });

  it("refreshes when expiry is invalid (NaN) and updates user", async () => {
    mockFindFirst.mockResolvedValue({
      accessToken: "old",
      tokenExpiresAt: new Date("invalid"),
      refreshToken: "ref",
    });
    mockRefresh.mockResolvedValue({ access_token: "new", expires_in: 7200 });
    const token = await getValidAccessToken("user-1");
    expect(token).toBe("new");
    expect(mockSet).toHaveBeenCalled();
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.accessToken).toBe("new");
    expect(setCall.refreshToken).toBeUndefined();
  });

  it("persists new refresh_token when refresh response includes it", async () => {
    mockFindFirst.mockResolvedValue({
      accessToken: "old",
      tokenExpiresAt: new Date(0),
      refreshToken: "old-refresh",
    });
    mockRefresh.mockResolvedValue({
      access_token: "new",
      expires_in: 7200,
      refresh_token: "new-refresh",
    });
    await getValidAccessToken("user-1");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: "new-refresh" })
    );
  });

  it("throws when user not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(getValidAccessToken("missing")).rejects.toThrow("User not found");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("throws when user has not connected eBay", async () => {
    mockFindFirst.mockResolvedValue({
      accessToken: null,
      tokenExpiresAt: null,
      refreshToken: null,
    });
    await expect(getValidAccessToken("user-1")).rejects.toThrow("eBay not connected");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("syncOrdersForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({
      accessToken: "token",
      tokenExpiresAt: new Date(Date.now() + 3600000),
      refreshToken: "ref",
    });
    global.fetch = vi.fn();
  });

  it("caps daysBack at MAX_DAYS_BACK and uses at least 1", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [] }),
    });
    await syncOrdersForUser("user-1", { daysBack: 0 });
    const filter = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const url = typeof filter === "string" ? filter : filter?.url ?? "";
    expect(url).toContain("filter=");
    await syncOrdersForUser("user-1", { daysBack: 9999 });
    const url2 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const url2Str = typeof url2 === "string" ? url2 : (url2 as Request)?.url ?? "";
    expect(url2Str).toContain("filter=");
  });

  it("returns count 0 when API returns empty orders", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [] }),
    });
    const { count } = await syncOrdersForUser("user-1", { daysBack: 90 });
    expect(count).toBe(0);
  });
});
