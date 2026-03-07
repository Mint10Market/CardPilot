"use client";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
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
