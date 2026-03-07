"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App error boundary:", error?.message, error?.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-lg font-semibold text-zinc-100">Something went wrong</h2>
      <p className="text-sm text-zinc-400">An error occurred. You can try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600"
      >
        Try again
      </button>
    </div>
  );
}
