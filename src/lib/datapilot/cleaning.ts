import { isMissing, median, numericValues, parseNumber, rowKey, inferType, columnValues } from "./analysis";
import type { Dataset } from "./types";

/** Every cleaning function is pure: it never mutates its input and returns a new Dataset. */
export interface CleanResult {
  data: Dataset;
  /** Number of cells or rows affected, depending on the action. */
  affected: number;
  summary: string;
}

function indicesFor(data: Dataset, columns: readonly string[]): number[] {
  const idx = columns.map((c) => data.columns.indexOf(c));
  const bad = columns.filter((_, i) => idx[i]! < 0);
  if (bad.length) throw new Error(`Unknown column(s): ${bad.join(", ")}`);
  if (idx.length === 0) throw new Error("Select at least one column.");
  return idx;
}

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

export function trimWhitespace(data: Dataset, columns: readonly string[]): CleanResult {
  const idx = indicesFor(data, columns);
  let changed = 0;
  const rows = data.rows.map((row) => {
    let copy: string[] | null = null;
    for (const c of idx) {
      const v = row[c] ?? "";
      const t = v.trim();
      if (t !== v) {
        copy ??= [...row];
        copy[c] = t;
        changed++;
      }
    }
    return copy ?? row;
  });
  return {
    data: { columns: data.columns, rows },
    affected: changed,
    summary: `Trimmed whitespace in ${plural(changed, "cell")}`,
  };
}

/** Removes rows whose values in the selected columns exactly match an earlier row. Keeps the first. */
export function removeDuplicates(data: Dataset, columns: readonly string[]): CleanResult {
  const idx = indicesFor(data, columns);
  const all = idx.length === data.columns.length;
  const seen = new Set<string>();
  const rows = data.rows.filter((row) => {
    const k = rowKey(row, all ? undefined : idx);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const removed = data.rows.length - rows.length;
  return {
    data: { columns: data.columns, rows },
    affected: removed,
    summary: `Removed ${plural(removed, "duplicate row")}`,
  };
}

/** Drops rows where ANY of the selected columns is missing (blank or whitespace only). */
export function dropMissingRows(data: Dataset, columns: readonly string[]): CleanResult {
  const idx = indicesFor(data, columns);
  const rows = data.rows.filter((row) => !idx.some((c) => isMissing(row[c])));
  const removed = data.rows.length - rows.length;
  return {
    data: { columns: data.columns, rows },
    affected: removed,
    summary: `Dropped ${plural(removed, "row")} with missing values`,
  };
}

export type FillStrategy = { kind: "custom"; value: string } | { kind: "mean" } | { kind: "median" };

export function formatFill(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}

/** Columns that cannot be filled with a numeric statistic, with the reason. */
export function invalidNumericFillColumns(
  data: Dataset,
  columns: readonly string[],
): { column: string; reason: string }[] {
  const out: { column: string; reason: string }[] = [];
  for (const c of columns) {
    const i = data.columns.indexOf(c);
    const t = inferType(columnValues(data, i));
    if (t === "empty") out.push({ column: c, reason: "has no values to compute from" });
    else if (t !== "numeric") out.push({ column: c, reason: `is ${t}, not numeric` });
  }
  return out;
}

export function fillMissing(
  data: Dataset,
  columns: readonly string[],
  strategy: FillStrategy,
): CleanResult {
  const idx = indicesFor(data, columns);
  const fillValues = new Map<number, string>();
  if (strategy.kind === "custom") {
    for (const c of idx) fillValues.set(c, strategy.value);
  } else {
    const invalid = invalidNumericFillColumns(data, columns);
    if (invalid.length)
      throw new Error(
        `${strategy.kind === "mean" ? "Mean" : "Median"} fill needs numeric columns: ${invalid
          .map((x) => `"${x.column}" ${x.reason}`)
          .join("; ")}.`,
      );
    for (const c of idx) {
      const nums = numericValues(data, c);
      const value =
        strategy.kind === "mean"
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : median([...nums].sort((a, b) => a - b));
      fillValues.set(c, formatFill(value));
    }
  }
  let filled = 0;
  const rows = data.rows.map((row) => {
    let copy: string[] | null = null;
    for (const c of idx) {
      if (isMissing(row[c])) {
        copy ??= [...row];
        copy[c] = fillValues.get(c)!;
        filled++;
      }
    }
    return copy ?? row;
  });
  const how =
    strategy.kind === "custom"
      ? strategy.value === ""
        ? "an empty value"
        : `"${strategy.value}"`
      : `the column ${strategy.kind}`;
  return {
    data: { columns: data.columns, rows },
    affected: filled,
    summary: `Filled ${plural(filled, "missing cell")} with ${how}`,
  };
}

export { parseNumber };
