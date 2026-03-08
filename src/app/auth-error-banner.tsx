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
};

export function AuthErrorBanner({ error }: { error: string }) {
  const msg = MESSAGES[error] ?? {
    title: "Something went wrong",
    body: "Try again or check the app configuration.",
  };

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm dark:border-amber-800 dark:bg-amber-950/50"
    >
      <p className="font-medium text-amber-800 dark:text-amber-200">{msg.title}</p>
      <p className="mt-1 text-amber-700 dark:text-amber-300">{msg.body}</p>
    </div>
  );
}
