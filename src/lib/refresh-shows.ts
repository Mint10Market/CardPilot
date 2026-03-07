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

  await db.delete(showSources);
  await db.delete(cardShows);

  let count = 0;
  for (const show of aggregated) {
    const { show: showRow, getSources } = toDbShow(show);
    const [inserted] = await db.insert(cardShows).values(showRow).returning({ id: cardShows.id });
    if (inserted) {
      const sources = getSources(inserted.id);
      if (sources.length) await db.insert(showSources).values(sources);
      count++;
    }
  }
  return { count };
}
