import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Card Pilot
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          by Mint 10 Market
        </p>
        <p className="text-zinc-600 dark:text-zinc-300 mb-8">
          Your all-in-one CRM, inventory, sales, and card show tracker for TCG and sports card sellers.
        </p>
        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 font-medium hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        ) : (
          <a
            href="/api/auth/ebay"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 font-medium hover:opacity-90"
          >
            Connect with eBay
          </a>
        )}
      </div>
    </div>
  );
}
