"use client";

const MESSAGES: Record<string, { title: string; body: string }> = {
  auth_failed: {
    title: "eBay sign-in didn’t complete",
    body:
      "The most common cause is a redirect URI mismatch. In Vercel, set EBAY_REDIRECT_URI to exactly " +
      "https://card-pilot.vercel.app/api/auth/ebay/callback (no trailing slash), and add the same URL in the eBay Developer Portal under your app’s OAuth redirect URIs. " +
      "Check your Vercel function logs for the exact error.",
  },
  invalid_state: {
    title: "Session state didn’t match",
    body:
      "Cookies may be blocked or the sign-in flow was started on a different URL. Try again in one browser tab and avoid switching domains (e.g. use card-pilot.vercel.app consistently).",
  },
  missing_code: {
    title: "No authorization code received",
    body: "eBay didn’t return a code. Try connecting again or confirm your eBay app redirect URI matches the callback URL above.",
  },
  config: {
    title: "Guest sign-in not available",
    body: "The database needs a migration so app-only (guest) users can be created. See the message below for how to fix.",
  },
};

export function AuthErrorBanner({ error, detail }: { error: string; detail?: string }) {
  const msg = MESSAGES[error] ?? {
    title: "Something went wrong",
    body: "Try again or check the app configuration.",
  };

  return (
    <div
      role="alert"
      className="mb-6 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning)]/10 p-4 text-left text-sm"
    >
      <p className="font-medium text-[var(--foreground)]">{msg.title}</p>
      <p className="mt-1 text-[var(--muted)]">{msg.body}</p>
      {detail ? (
        <p className="mt-2 font-mono text-xs text-[var(--muted)] break-all">
          {(() => {
            try {
              return decodeURIComponent(detail);
            } catch {
              return detail;
            }
          })()}
        </p>
      ) : null}
    </div>
  );
}
