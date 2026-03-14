import { staticSourceAdapter } from "./static-source";
import { jsonFeedSourceAdapter } from "./json-feed-source";
import type { ShowSourceAdapter } from "./types";

export const showSourceAdapters: ShowSourceAdapter[] = [
  jsonFeedSourceAdapter,
  staticSourceAdapter,
  // Add more adapters when APIs are available, e.g.:
  // cardShowAlertsAdapter,
  // tcdbAdapter,
];

export type { RawShow, ShowSourceAdapter } from "./types";
