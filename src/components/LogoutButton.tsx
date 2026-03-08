"use client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        console.error("Logout failed:", res.status);
        return;
      }
    } catch (e) {
      console.error("Logout request failed:", e);
      return;
    }
    window.location.href = "/";
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] min-h-[44px] flex items-center"
    >
      Log out
    </button>
  );
}
