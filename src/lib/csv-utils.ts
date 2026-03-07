/**
 * Parse a CSV line respecting quoted fields and escaped quotes ("" → ").
 * RFC 4180: quotes inside a quoted field are escaped by doubling.
 */
export function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === "," || c === "\n") {
        out.push(cur.trim());
        cur = "";
        if (c === "\n") break;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Normalize price to a valid decimal string (at most one decimal point).
 * Invalid input (e.g. "1.2.3") is coerced to a valid form (e.g. "1.2") or "0".
 */
export function parsePrice(raw: string): string {
  const stripped = raw.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) return "0";
  if (parts.length === 1) return stripped;
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  const combined = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  const num = parseFloat(combined);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}
