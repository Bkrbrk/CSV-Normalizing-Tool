import type { ColumnProfile, ColumnType, Dataset, NumericStats, QualityMetrics } from "./types";

/**
 * The single definition of "missing" used everywhere in DataPilot:
 * a cell is missing only when it is empty or contains whitespace only.
 * "0", "false", "N/A" and "null" are real values and are preserved.
 */
export function isMissing(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

const NUMBER_RE = /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i;
const THOUSANDS_RE = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/;

/** Parses a strict numeric string (optionally with thousands separators). Returns null if not numeric. */
export function parseNumber(value: string): number | null {
  const v = value.trim();
  if (v === "") return null;
  if (NUMBER_RE.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (THOUSANDS_RE.test(v)) {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no"]);

export function isBooleanLike(value: string): boolean {
  return BOOLEAN_VALUES.has(value.trim().toLowerCase());
}

const DATE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{1,2}-\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/,
  /^\d{4}\/\d{1,2}\/\d{1,2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  /^\d{1,2}-\d{1,2}-\d{4}$/,
];

export function isDateLike(value: string): boolean {
  const v = value.trim();
  if (!DATE_PATTERNS.some((re) => re.test(v))) return false;
  const parts = v.split(/[-/T ]/).map((p) => parseInt(p, 10));
  const [p0 = 0, p1 = 0, p2 = 0] = parts;
  const iso = /^\d{4}/.test(v);
  const year = iso ? p0 : p2;
  let month = iso ? p1 : p0; // US style m/d/yyyy when not ISO
  let day = iso ? p2 : p1;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    // allow d/m/yyyy too
    if (!/^\d{4}/.test(v) && day >= 1 && day <= 12 && month >= 1 && month <= 31) {
      [month, day] = [day, month];
    } else return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Infers a column type from its non-missing values. Every value must match for a non-text type. */
export function inferType(values: readonly string[]): ColumnType {
  const present = values.filter((v) => !isMissing(v));
  if (present.length === 0) return "empty";
  if (present.every((v) => parseNumber(v) !== null)) return "numeric";
  if (present.every(isBooleanLike)) return "boolean";
  if (present.every(isDateLike)) return "date";
  return "text";
}

export function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function numericStats(nums: readonly number[]): NumericStats | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const variance =
    sorted.length > 1
      ? sorted.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (sorted.length - 1)
      : 0;
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median: median(sorted),
    std: Math.sqrt(variance),
    sum,
  };
}

export function columnValues(data: Dataset, index: number): string[] {
  return data.rows.map((r) => r[index] ?? "");
}

export function numericValues(data: Dataset, index: number): number[] {
  const out: number[] = [];
  for (const r of data.rows) {
    const n = parseNumber(r[index] ?? "");
    if (n !== null) out.push(n);
  }
  return out;
}

export function profileColumn(data: Dataset, index: number): ColumnProfile {
  const values = columnValues(data, index);
  const counts = new Map<string, number>();
  let missing = 0;
  let numericCount = 0;
  const nums: number[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      missing++;
      continue;
    }
    counts.set(v, (counts.get(v) ?? 0) + 1);
    const n = parseNumber(v);
    if (n !== null) {
      numericCount++;
      nums.push(n);
    }
  }
  const nonMissing = values.length - missing;
  const type = inferType(values);
  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));
  return {
    name: data.columns[index]!,
    index,
    type,
    nonMissing,
    missing,
    missingPct: values.length ? (missing / values.length) * 100 : 0,
    unique: counts.size,
    numericShare: nonMissing ? numericCount / nonMissing : 0,
    numeric: type === "numeric" ? numericStats(nums) : null,
    topValues,
  };
}

export function profileDataset(data: Dataset): ColumnProfile[] {
  return data.columns.map((_, i) => profileColumn(data, i));
}

export function rowKey(row: readonly string[], indices?: readonly number[]): string {
  // JSON encoding avoids collisions such as ["a,b","c"] vs ["a","b,c"].
  return JSON.stringify(indices ? indices.map((i) => row[i] ?? "") : row);
}

/** Number of rows that exactly repeat an earlier row (all cells identical, byte for byte). */
export function countDuplicateRows(data: Dataset, indices?: readonly number[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const row of data.rows) {
    const k = rowKey(row, indices);
    if (seen.has(k)) dupes++;
    else seen.add(k);
  }
  return dupes;
}

export function countMissingCells(data: Dataset): number {
  let n = 0;
  const width = data.columns.length;
  for (const row of data.rows) for (let c = 0; c < width; c++) if (isMissing(row[c])) n++;
  return n;
}

export function missingByColumn(data: Dataset): { column: string; missing: number; pct: number }[] {
  const counts = data.columns.map(() => 0);
  for (const row of data.rows)
    for (let c = 0; c < counts.length; c++) if (isMissing(row[c])) counts[c] = (counts[c] ?? 0) + 1;
  return data.columns.map((column, i) => ({
    column,
    missing: counts[i] ?? 0,
    pct: data.rows.length ? ((counts[i] ?? 0) / data.rows.length) * 100 : 0,
  }));
}

export function computeMetrics(data: Dataset): QualityMetrics {
  const rows = data.rows.length;
  const columns = data.columns.length;
  const totalCells = rows * columns;
  const missingCells = countMissingCells(data);
  return {
    rows,
    columns,
    totalCells,
    missingCells,
    duplicateRows: countDuplicateRows(data),
    completeness: totalCells ? ((totalCells - missingCells) / totalCells) * 100 : 100,
  };
}

/** Histogram bins using Sturges' rule (capped), for live chart rendering. */
export function histogram(
  nums: readonly number[],
  maxBins = 20,
): { label: string; start: number; end: number; count: number }[] {
  if (nums.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const n of nums) {
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (min === max) return [{ label: formatNumber(min), start: min, end: max, count: nums.length }];
  // Small integer ranges get one bar per integer value (e.g. quantities 0–6).
  if (nums.every(Number.isInteger) && max - min + 1 <= maxBins) {
    const out = Array.from({ length: max - min + 1 }, (_, i) => ({
      label: formatNumber(min + i),
      start: min + i,
      end: min + i,
      count: 0,
    }));
    for (const n of nums) out[n - min]!.count++;
    return out;
  }
  const bins = Math.min(maxBins, Math.max(1, Math.ceil(Math.log2(nums.length) + 1)));
  const width = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    start: min + i * width,
    end: i === bins - 1 ? max : min + (i + 1) * width,
    count: 0,
    label: "",
  }));
  for (const n of nums) {
    const idx = Math.min(bins - 1, Math.floor((n - min) / width));
    out[idx]!.count++;
  }
  for (const b of out) b.label = `${formatNumber(b.start)}–${formatNumber(b.end)}`;
  return out;
}

/** Frequency of distinct non-missing values; long tails are grouped into "Other". */
export function categoryFrequency(
  data: Dataset,
  index: number,
  top = 12,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of data.rows) {
    const v = r[index] ?? "";
    if (isMissing(v)) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, top).map(([value, count]) => ({ value, count }));
  const rest = sorted.slice(top).reduce((acc, [, c]) => acc + c, 0);
  if (rest > 0) head.push({ value: `Other (${sorted.length - top} values)`, count: rest });
  return head;
}

export function formatNumber(n: number, maxDigits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
}
