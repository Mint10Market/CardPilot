import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Centralized API error handler: logs the error and returns a JSON response.
 * 401 for Unauthorized, 400 for validation-style errors, 500 otherwise.
 */
export function handleApiError(e: unknown): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  if (e instanceof Error) {
    logger.error("API error:", e.message, isDev ? e.stack : "");
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  logger.error("API error (non-Error):", e);
  return NextResponse.json({ error: "An error occurred" }, { status: 500 });
}
