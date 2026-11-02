import Papa from "papaparse";
import type { Dataset } from "./types";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvError";
  }
}

export interface ParseResult {
  data: Dataset;
  warnings: string[];
}

/** Makes header names non-empty and unique so every column can be addressed. */
export function normalizeHeaders(raw: readonly string[]): string[] {
  const used = new Set<string>();
  return raw.map((h, i) => {
    const base = h.trim() === "" ? `Column ${i + 1}` : h.trim();
    let name = base;
    let n = 2;
    while (used.has(name)) name = `${base} (${n++})`;
    used.add(name);
    return name;
  });
}

/**
 * Parses CSV text into a Dataset. The first row is the header.
 * Handles a UTF-8 BOM, quoted fields, embedded commas/quotes/newlines, CRLF line endings,
 * and ragged rows (padded or truncated with a warning).
 */
export function parseCsvText(text: string): ParseResult {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (clean.trim() === "") throw new CsvError("The file is empty.");
  if (clean.includes("\u0000"))
    throw new CsvError("This looks like a binary file, not a text CSV file.");

  const result = Papa.parse<string[]>(clean, { header: false, skipEmptyLines: "greedy" });
  const fatal = result.errors.find((e) => e.type === "Quotes");
  if (fatal) {
    throw new CsvError(
      `Malformed CSV: unmatched quote near row ${(fatal.row ?? 0) + 1}. Check that quoted fields are closed.`,
    );
  }
  const all = result.data;
  if (all.length === 0) throw new CsvError("The file is empty.");
  const header = all[0]!;
  const columns = normalizeHeaders(header);
  const body = all.slice(1);
  if (body.length === 0) throw new CsvError("The file has a header row but no data rows.");

  const warnings: string[] = [];
  let padded = 0;
  let truncated = 0;
  const rows = body.map((r) => {
    if (r.length === columns.length) return r;
    if (r.length < columns.length) {
      padded++;
      return [...r, ...Array(columns.length - r.length).fill("")];
    }
    truncated++;
    return r.slice(0, columns.length);
  });
  if (padded)
    warnings.push(`${padded} row(s) had fewer fields than the header and were padded with blanks.`);
  if (truncated)
    warnings.push(`${truncated} row(s) had extra fields beyond the header; extras were dropped.`);
  if (header.some((h) => h.trim() === ""))
    warnings.push("Some header cells were blank and were given generated names.");
  if (new Set(header.map((h) => h.trim())).size !== header.length)
    warnings.push("Duplicate column names were made unique.");
  if (clean.includes("\uFFFD"))
    warnings.push("Some characters could not be decoded as UTF-8 and appear as \u201C\uFFFD\u201D.");

  return { data: { columns, rows }, warnings };
}

/** Validates file metadata before reading. Throws a CsvError with a human message. */
export function validateFile(file: { name: string; size: number; type?: string }): void {
  const lower = file.name.toLowerCase();
  const okExt = lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv");
  const okType = !file.type || /csv|text\/plain|excel|tab-separated/.test(file.type);
  if (!okExt && !okType)
    throw new CsvError(`"${file.name}" is not a CSV file. Please choose a .csv file.`);
  if (file.size === 0) throw new CsvError(`"${file.name}" is empty (0 bytes).`);
  if (file.size > MAX_FILE_BYTES)
    throw new CsvError(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB for in-browser processing.`,
    );
}

export async function parseCsvFile(file: File): Promise<ParseResult> {
  validateFile(file);
  const text = await file.text(); // decodes as UTF-8
  return parseCsvText(text);
}

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Spreadsheet apps may execute cells starting with = + - @ (CSV/formula injection).
 * Such cells are prefixed with an apostrophe. Plain numbers such as "-12.5" are left untouched.
 */
export function protectFormula(value: string): string {
  if (!FORMULA_START.test(value)) return value;
  if (/^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i.test(value)) return value;
  return `'${value}`;
}

export interface ExportOptions {
  /** Prefix risky formula-like cells with an apostrophe. Default true. */
  protectFormulas?: boolean;
  /** Prepend a UTF-8 byte order mark so Excel detects Unicode. Default true. */
  includeBom?: boolean;
}

/** Serializes a dataset to RFC 4180 CSV (CRLF, quotes doubled, fields quoted when needed). */
export function toCsv(data: Dataset, opts: ExportOptions = {}): string {
  const { protectFormulas = true, includeBom = true } = opts;
  const map = protectFormulas ? protectFormula : (v: string) => v;
  const csv = Papa.unparse(
    {
      fields: data.columns.map(map),
      data: data.rows.map((r) => r.map((v) => map(v ?? ""))),
    },
    { newline: "\r\n", quotes: false, escapeFormulae: false },
  );
  return (includeBom ? "\uFEFF" : "") + csv;
}

export function countProtectedCells(data: Dataset): number {
  let n = 0;
  for (const r of data.rows) for (const v of r) if (protectFormula(v) !== v) n++;
  for (const h of data.columns) if (protectFormula(h) !== h) n++;
  return n;
}

/** Triggers a browser download. Only call from event handlers. */
export function downloadText(content: string, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
