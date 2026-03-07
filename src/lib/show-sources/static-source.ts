/**
 * Static/curated source: reads from a JSON file or returns seed data.
 * In production this could be replaced with an API client for Card Show Alerts, TCDB, etc.
 */
import type { ShowSourceAdapter, RawShow } from "./types";

const SEED_SHOWS: RawShow[] = [
  {
    externalId: "static-1",
    name: "Dallas Card Show",
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    city: "Dallas",
    state: "TX",
    country: "US",
    venue: "Dallas Convention Center",
    vendorCount: 120,
    organizerName: "Dallas Card Events",
    organizerEmail: "info@dallascardevents.com",
    boothInfo: "Tables $150. Contact organizer.",
  },
  {
    externalId: "static-2",
    name: "Houston Sports Card & Memorabilia Show",
    startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    city: "Houston",
    state: "TX",
    country: "US",
    venue: "NRG Park",
    vendorCount: 85,
    organizerName: "Houston Card Shows",
    boothInfo: "Booths from $200. See website.",
  },
  {
    externalId: "static-3",
    name: "Austin TCG & Sports Card Fair",
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    city: "Austin",
    state: "TX",
    country: "US",
    venue: "Palmer Events Center",
    vendorCount: 45,
    organizerPhone: "(512) 555-0100",
    boothInfo: "Vendor tables $100. Limited availability.",
  },
];

export const staticSourceAdapter: ShowSourceAdapter = {
  name: "static",
  async fetch() {
    return SEED_SHOWS;
  },
};
