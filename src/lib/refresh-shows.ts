import { showSourceAdapters } from "./show-sources";
import { aggregateShows, toDbShow } from "./show-aggregator";
import { db } from "./db";
import { cardShows, showSources } from "./db/schema";

export async function refreshShows(): Promise<{ count: number }> {
  const sourceResults = await Promise.all(
    showSourceAdapters.map(async (adapter) => {
      try {
        const raws = await adapter.fetch();
        return { sourceName: adapter.name, raws };
      } catch (e) {
        console.error(`Show source ${adapter.name} failed:`, e);
        return { sourceName: adapter.name, raws: [] };
      }
    })
  );

  const aggregated = aggregateShows(sourceResults);

  const count = await db.transaction(async (tx) => {
    // Delete card_shows first; FK cascade removes show_sources. Single transaction avoids
    // concurrent refresh runs interleaving (e.g. one run wiping another's inserts).
    await tx.delete(cardShows);
    let n = 0;
    for (const show of aggregated) {
      const { show: showRow, getSources } = toDbShow(show);
      const [inserted] = await tx.insert(cardShows).values(showRow).returning({ id: cardShows.id });
      if (inserted) {
        const sources = getSources(inserted.id);
        if (sources.length) await tx.insert(showSources).values(sources);
        n++;
      }
    }
    return n;
  });

  return { count };
}
