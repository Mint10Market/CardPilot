/**
 * Parse Sports Card Collection Tracker xlsx and return data for DB insert.
 * Sheet names: "Card Transactions", "Expenses", "Charts, Formulas & Drop-Downs", "Sales Tax".
 */

import * as XLSX from "xlsx";

const CARD_SHEETS = ["Card Transactions", "Card transactions", "card transactions"];
const EXPENSES_SHEET = "Expenses";
const SALES_TAX_SHEET = "Sales Tax";

/** Excel serial date to ISO date string (UTC day). */
function excelDateToISO(n: number): string | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  // Excel epoch: 1899-12-30; 25569 = days to 1970-01-01
  const utc = (n - 25569) * 86400 * 1000;
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const x = parseFloat(String(val));
  return Number.isFinite(x) ? x : null;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

/** Normalize header for matching. */
function norm(h: string): string {
  return (h ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\./g, "");
}

/** Build index map: normalized header -> column index. */
function headerIndex(row: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  row.forEach((cell, i) => {
    const key = norm(String(cell ?? ""));
    if (key && !map.has(key)) map.set(key, i);
  });
  return map;
}

function get(row: unknown[], idx: number): unknown {
  return idx >= 0 && idx < row.length ? row[idx] : undefined;
}

export interface CardTransactionRow {
  purcDate: string | null;
  purcSource: string | null;
  shippingCost: string;
  qty: number | null;
  year: string | null;
  setName: string | null;
  variation: string | null;
  cardType: string | null;
  playerCharacter: string | null;
  sport: string | null;
  team: string | null;
  cardNotes: string | null;
  attributes: string | null;
  numberedTo: string | null;
  grade: string | null;
  gradingCompany: string | null;
  certNumber: string | null;
  cardPurcPrice: string;
  soldDate: string | null;
  sellPrice: string;
  soldSource: string | null;
  stateSold: string | null;
  feeType: string | null;
  notes: string | null;
}

const CARD_HEADER_ALIASES: Record<string, string[]> = {
  purcdate: ["purc date", "purc. date", "purchase date"],
  purcsource: ["purc source", "purc. source", "purchase source"],
  shippingcost: ["shipping cost", "shipping"],
  qty: ["qty", "quantity"],
  year: ["year"],
  setname: ["set", "set name"],
  variation: ["variation"],
  cardtype: ["card type", "card type"],
  playercharacter: ["playercharacter", "player/character", "player"],
  sport: ["sport"],
  team: ["team"],
  cardnotes: ["card notes", "notes"],
  attributes: ["attributes"],
  numberedto: ["'d to", "numbered to", "#'d to"],
  grade: ["grade"],
  gradingcompany: ["grading company", "grading company"],
  certnumber: ["cert number", "cert #"],
  cardpurcprice: ["card purc price", "card purc. price", "purchase price"],
  solddate: ["sold date", "sold date"],
  sellprice: ["sell price", "sell price"],
  soldsource: ["sold source", "sold source"],
  statesold: ["state sold", "state"],
  feetype: ["fee type", "fee type"],
  notes: ["notes"],
};

function findCol(map: Map<string, number>, ...keys: string[]): number {
  for (const k of keys) {
    const idx = map.get(k);
    if (idx !== undefined) return idx;
    const aliases = CARD_HEADER_ALIASES[k];
    if (aliases) {
      for (const a of aliases) {
        const i = map.get(a.replace(/\s+/g, " "));
        if (i !== undefined) return i;
      }
    }
  }
  return -1;
}

export interface ExpenseRow {
  expenseName: string;
  category: string;
  expenseDate: string;
  amount: string;
}

export interface ReferenceRow {
  type: string;
  value: string;
  meta?: Record<string, unknown>;
}

export interface ParsedCollection {
  cardTransactions: CardTransactionRow[];
  expenses: ExpenseRow[];
  reference: ReferenceRow[];
}

export function parseCollectionXlsx(buffer: Buffer): ParsedCollection {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const cardRows: CardTransactionRow[] = [];
  const expenseRows: ExpenseRow[] = [];
  const referenceRows: ReferenceRow[] = [];

  // Card Transactions
  const cardSheetName = workbook.SheetNames.find((n) =>
    CARD_SHEETS.some((s) => s.toLowerCase() === n.toLowerCase())
  );
  if (cardSheetName) {
    const sheet = workbook.Sheets[cardSheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (Array.isArray(data) && data.length > 1) {
      const headers = data[0] as unknown[];
      const map = headerIndex(headers);
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as unknown[];
        if (!Array.isArray(row)) continue;
        const purcDateVal = get(row, findCol(map, "purcdate"));
        const purcDate =
          typeof purcDateVal === "number"
            ? excelDateToISO(purcDateVal)
            : toStr(purcDateVal);
        const soldDateVal = get(row, findCol(map, "solddate"));
        const soldDate =
          typeof soldDateVal === "number"
            ? excelDateToISO(soldDateVal)
            : toStr(soldDateVal);
        const shipping = toNum(get(row, findCol(map, "shippingcost"))) ?? 0;
        const cardPrice = toNum(get(row, findCol(map, "cardpurcprice"))) ?? 0;
        const sellPriceNum = toNum(get(row, findCol(map, "sellprice"))) ?? 0;
        cardRows.push({
          purcDate,
          purcSource: toStr(get(row, findCol(map, "purcsource"))),
          shippingCost: String(shipping),
          qty: toNum(get(row, findCol(map, "qty"))) ?? null,
          year: toStr(get(row, findCol(map, "year"))),
          setName: toStr(get(row, findCol(map, "setname"))),
          variation: toStr(get(row, findCol(map, "variation"))),
          cardType: toStr(get(row, findCol(map, "cardtype"))),
          playerCharacter: toStr(get(row, findCol(map, "playercharacter"))),
          sport: toStr(get(row, findCol(map, "sport"))),
          team: toStr(get(row, findCol(map, "team"))),
          cardNotes: toStr(get(row, findCol(map, "cardnotes"))),
          attributes: toStr(get(row, findCol(map, "attributes"))),
          numberedTo: toStr(get(row, findCol(map, "numberedto"))),
          grade: toStr(get(row, findCol(map, "grade"))),
          gradingCompany: toStr(get(row, findCol(map, "gradingcompany"))),
          certNumber: toStr(get(row, findCol(map, "certnumber"))),
          cardPurcPrice: String(cardPrice),
          soldDate,
          sellPrice: String(sellPriceNum),
          soldSource: toStr(get(row, findCol(map, "soldsource"))),
          stateSold: toStr(get(row, findCol(map, "statesold"))),
          feeType: toStr(get(row, findCol(map, "feetype"))),
          notes: toStr(get(row, findCol(map, "notes"))),
        });
      }
    }
  }

  // Expenses: A=Name, B=Category, C=Date, D=Amount (Purchase Price)
  const expSheet = workbook.SheetNames.find(
    (n) => n.toLowerCase() === EXPENSES_SHEET.toLowerCase()
  );
  if (expSheet) {
    const sheet = workbook.Sheets[expSheet];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (Array.isArray(data) && data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as unknown[];
        if (!Array.isArray(row)) continue;
        const name = toStr(row[0]);
        const category = toStr(row[1]);
        const dateVal = row[2];
        const date =
          typeof dateVal === "number"
            ? excelDateToISO(dateVal)
            : toStr(dateVal);
        const amount = toNum(row[3]) ?? 0;
        if (name && category && date && amount >= 0) {
          expenseRows.push({
            expenseName: name,
            category,
            expenseDate: date,
            amount: String(amount),
          });
        }
      }
    }
  }

  // Sales Tax: State, State Tax Rate -> reference_data type state_tax_rates
  const taxSheet =
    workbook.SheetNames.find((n) => n.toLowerCase() === SALES_TAX_SHEET.toLowerCase()) ??
    workbook.SheetNames.find(
      (n) => n.toLowerCase().includes("sales") && n.toLowerCase().includes("tax")
    );
  if (taxSheet) {
    const sheet = workbook.Sheets[taxSheet];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (Array.isArray(data) && data.length > 1) {
      const headers = (data[0] as unknown[]).map((h) => norm(String(h ?? "")));
      const stateIdx = headers.findIndex((h) => h.includes("state") && !h.includes("rate"));
      const rateIdx = headers.findIndex((h) => h.includes("rate") || h.includes("tax"));
      if (stateIdx >= 0 && rateIdx >= 0) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as unknown[];
          if (!Array.isArray(row)) continue;
          const state = toStr(row[stateIdx]);
          const rate = toNum(row[rateIdx]);
          if (state && rate != null) {
            referenceRows.push({
              type: "state_tax_rates",
              value: state,
              meta: { rate },
            });
          }
        }
      }
    }
  }

  return { cardTransactions: cardRows, expenses: expenseRows, reference: referenceRows };
}
