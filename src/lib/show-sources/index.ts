import { staticSourceAdapter } from "./static-source";
import type { ShowSourceAdapter } from "./types";

export const showSourceAdapters: ShowSourceAdapter[] = [
  staticSourceAdapter,
  // Add more adapters when APIs are available, e.g.:
  // cardShowAlertsAdapter,
  // tcdbAdapter,
];

export type { RawShow, ShowSourceAdapter } from "./types";
