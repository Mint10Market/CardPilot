import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import { AuthErrorBanner } from "./auth-error-banner";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await getCurrentUser();
  const { error, message } = await searchParams;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Card Pilot
        </h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          by Mint 10 Market
        </p>
        {error ? <AuthErrorBanner error={error} detail={message} /> : null}
        <p className="text-[var(--foreground)] mb-8">
          Your all-in-one CRM, inventory, sales, and card show tracker for TCG and sports card sellers.
        </p>
        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-6 font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="/api/auth/ebay"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-6 font-medium hover:opacity-90 transition-opacity"
            >
              Connect with eBay
            </a>
            <a
              href="/api/auth/guest"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-6 font-medium hover:border-[var(--muted)] transition-colors"
            >
              Continue without connecting
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
