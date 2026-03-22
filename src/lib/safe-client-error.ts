/**
 * True when the message likely contains SQL from Drizzle/postgres (any statement type).
 * Sync and other routes run DELETE + INSERT; "Failed query: delete from ..." must not reach clients.
 */
function messageLooksLikeSqlLeak(message: string): boolean {
  if (message.length > 800) return true;
  if (/failed query/i.test(message)) return true;
  // Typical Drizzle-quoted identifiers in leaked statements
  if (/\binsert\s+into\s+"/i.test(message)) return true;
  if (/\bdelete\s+from\s+"/i.test(message)) return true;
  if (/\bupdate\s+"/i.test(message)) return true;
  if (/\bmerge\s+into\s+"/i.test(message)) return true;
  if (/\btruncate\s+table\s+"/i.test(message)) return true;
  if (/\b(create|alter|drop)\s+table\s+"/i.test(message)) return true;
  return false;
}

/**
 * Map thrown errors to short messages safe to return in JSON API responses.
 * Drizzle/postgres often embed full SQL in Error.message — never send that to the browser.
 */
export function safeClientErrorMessage(
  e: unknown,
  fallback = "Something went wrong. Try again."
): string {
  if (!(e instanceof Error)) return fallback;
  const m = e.message;
  if (messageLooksLikeSqlLeak(m)) {
    return fallback;
  }
  return m;
}
