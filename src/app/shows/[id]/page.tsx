import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Link from "next/link";
import { db } from "@/lib/db";
import { cardShows, showSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;

  const show = await db.query.cardShows.findFirst({
    where: eq(cardShows.id, id),
  });
  if (!show) notFound();

  const sources = await db.query.showSources.findMany({
    where: eq(showSources.showId, id),
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-[var(--foreground)]">
            Card Pilot
          </Link>
          <Link href="/shows" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:underline">
            ← Card Shows
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-4 flex items-center gap-3">
          {show.hotColdRating && (
            <span
              className={`rounded-[var(--radius)] px-2 py-1 text-sm font-medium ${
                show.hotColdRating === "hot"
                  ? "bg-[var(--error)]/15 text-[var(--error)]"
                  : show.hotColdRating === "warm"
                    ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                    : "bg-[var(--table-header)] text-[var(--muted)]"
              }`}
            >
              {show.hotColdRating}
            </span>
          )}
          {show.credibilityScore != null && show.credibilityScore > 0 && (
            <span className="text-sm text-[var(--muted)]">
              Listed in {show.credibilityScore} source{show.credibilityScore !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
          {show.name}
        </h1>

        <section className="space-y-4 mb-8">
          <div>
            <h2 className="text-sm font-medium text-[var(--muted)] mb-1">
              When
            </h2>
            <p className="text-[var(--foreground)]">
              {new Date(show.startDate).toLocaleString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {show.endDate &&
                ` – ${new Date(show.endDate).toLocaleString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
            </p>
          </div>
          {(show.venue || show.address || show.city) && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-1">
                Where
              </h2>
              <p className="text-[var(--foreground)]">
                {[show.venue, show.address, [show.city, show.state].filter(Boolean).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
          {(show.organizerName || show.organizerEmail || show.organizerPhone) && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-1">
                Contact / Host
              </h2>
              <p className="text-[var(--foreground)]">
                {show.organizerName && <span>{show.organizerName}</span>}
                {show.organizerEmail && (
                  <span className="block">
                    <a href={`mailto:${show.organizerEmail}`} className="text-[var(--info)] hover:underline">
                      {show.organizerEmail}
                    </a>
                  </span>
                )}
                {show.organizerPhone && (
                  <span className="block">
                    <a href={`tel:${show.organizerPhone}`} className="text-[var(--info)] hover:underline">
                      {show.organizerPhone}
                    </a>
                  </span>
                )}
              </p>
            </div>
          )}
          {show.boothInfo && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-1">
                How to buy a booth
              </h2>
              <p className="text-[var(--foreground)] whitespace-pre-wrap">
                {show.boothInfo}
              </p>
            </div>
          )}
          {show.vendorCount != null && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-1">
                Vendors
              </h2>
              <p className="text-[var(--foreground)]">{show.vendorCount} vendors</p>
            </div>
          )}
        </section>

        {sources.length > 0 && (
          <p className="text-xs text-[var(--muted)]">
            Sources: {sources.map((s) => s.sourceName).join(", ")}
          </p>
        )}
      </main>
    </div>
  );
}
