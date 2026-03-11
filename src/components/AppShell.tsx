import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { Nav } from "./Nav";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="font-semibold text-[var(--foreground)]"
          >
            Card Pilot
          </Link>
          <div className="flex items-center gap-4">
            <Nav />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-4 md:mb-6">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
