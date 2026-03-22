/**
 * Dynamic field keys for add-item wizard → stored in extra_details JSON.
 */

export const SPORTS = [
  "Baseball",
  "Basketball",
  "Football",
  "Hockey",
  "Soccer",
  "Wrestling",
  "Racing",
  "Other sport",
] as const;

export const TCG_GAMES = [
  "Pokémon",
  "Magic: The Gathering",
  "Yu-Gi-Oh!",
  "Disney Lorcana",
  "One Piece",
  "Other TCG",
] as const;

export type SportFieldKey =
  | "player"
  | "team"
  | "year"
  | "set"
  | "parallel"
  | "grade"
  | "certNumber";

export type TcgFieldKey = "set" | "character" | "rarity" | "language" | "edition";

export type CollectibleFieldKey = "franchise" | "type" | "era" | "material";

export const sportCardFields: { key: SportFieldKey; label: string; placeholder?: string }[] = [
  { key: "player", label: "Player", placeholder: "e.g. Mike Trout" },
  { key: "team", label: "Team" },
  { key: "year", label: "Year" },
  { key: "set", label: "Set / product" },
  { key: "parallel", label: "Parallel / insert" },
  { key: "grade", label: "Grade" },
  { key: "certNumber", label: "Cert #" },
];

export const tcgFields: { key: TcgFieldKey; label: string; placeholder?: string }[] = [
  { key: "set", label: "Set" },
  { key: "character", label: "Character / name" },
  { key: "rarity", label: "Rarity" },
  { key: "language", label: "Language" },
  { key: "edition", label: "Edition / variant" },
];

export const collectibleFields: { key: CollectibleFieldKey; label: string; placeholder?: string }[] = [
  { key: "franchise", label: "Franchise / IP" },
  { key: "type", label: "Type (figure, bobblehead, …)" },
  { key: "era", label: "Era / year" },
  { key: "material", label: "Material / notes" },
];

export function buildTitleFromExtra(
  baseKind: "sport" | "tcg" | "collectible",
  extra: Record<string, string>
): string {
  const parts: string[] = [];
  if (baseKind === "sport") {
    if (extra.player) parts.push(extra.player);
    if (extra.year) parts.push(extra.year);
    if (extra.set) parts.push(extra.set);
    if (extra.parallel) parts.push(extra.parallel);
  } else if (baseKind === "tcg") {
    if (extra.character) parts.push(extra.character);
    if (extra.set) parts.push(extra.set);
    if (extra.rarity) parts.push(extra.rarity);
  } else {
    if (extra.type) parts.push(extra.type);
    if (extra.franchise) parts.push(extra.franchise);
    if (extra.era) parts.push(extra.era);
  }
  return parts.filter(Boolean).join(" · ") || "Untitled item";
}
