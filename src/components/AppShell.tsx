import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="font-semibold text-[var(--foreground)]"
          >
            Card Pilot
          </Link>
          <div className="flex items-center gap-4">
          <nav className="flex gap-4 text-sm" aria-label="Main">
            <Link
              href="/dashboard"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Dashboard
            </Link>
            <Link
              href="/sales"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Sales
            </Link>
            <Link
              href="/inventory"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Inventory
            </Link>
            <Link
              href="/customers"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Customers
            </Link>
            <Link
              href="/collection"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Collection
            </Link>
            <Link
              href="/shows"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Card Shows
            </Link>
          </nav>
          <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-4 md:mb-6">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
