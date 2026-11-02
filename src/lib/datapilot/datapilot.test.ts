import { describe, expect, it } from "vitest";
import {
  categoryFrequency,
  computeMetrics,
  countDuplicateRows,
  countMissingCells,
  histogram,
  inferType,
  isMissing,
  profileColumn,
} from "./analysis";
import { CsvError, MAX_FILE_BYTES, parseCsvText, protectFormula, toCsv, validateFile } from "./csv";
import { dropMissingRows, fillMissing, removeDuplicates, trimWhitespace } from "./cleaning";
import { applyStep, createWorkspace, currentData, reset, revertTo, undo } from "./history";
import { DEMO_CSV } from "./demo";
import type { Dataset } from "./types";

const ds = (columns: string[], rows: string[][]): Dataset => ({ columns, rows });

describe("CSV parsing", () => {
  it("handles quoted commas, escaped quotes, embedded newlines and CRLF", () => {
    const text = 'name,note\r\n"Smith, Jo","He said ""hi"""\r\n"Ann","line1\nline2"\r\n';
    const { data } = parseCsvText(text);
    expect(data.columns).toEqual(["name", "note"]);
    expect(data.rows).toEqual([
      ["Smith, Jo", 'He said "hi"'],
      ["Ann", "line1\nline2"],
    ]);
  });

  it("strips a UTF-8 BOM and keeps Unicode intact", () => {
    const { data } = parseCsvText("\uFEFFcity,price\nZürich,5\n東京,7\n");
    expect(data.columns[0]).toBe("city");
    expect(data.rows.map((r) => r[0])).toEqual(["Zürich", "東京"]);
  });

  it("rejects empty, header-only, and malformed files with clear errors", () => {
    expect(() => parseCsvText("")).toThrow("The file is empty.");
    expect(() => parseCsvText("  \n \n")).toThrow(CsvError);
    expect(() => parseCsvText("a,b\n")).toThrow("header row but no data rows");
    expect(() => parseCsvText('a,b\n"unclosed,1\n')).toThrow(/unmatched quote/);
  });

  it("pads short rows, truncates long rows and names blank/duplicate headers", () => {
    const { data, warnings } = parseCsvText("a,,a\n1\n1,2,3,4\n");
    expect(data.columns).toEqual(["a", "Column 2", "a (2)"]);
    expect(data.rows).toEqual([
      ["1", "", ""],
      ["1", "2", "3"],
    ]);
    expect(warnings.length).toBe(4);
  });

  it("validates file type and the 10 MB size limit", () => {
    expect(() => validateFile({ name: "x.pdf", size: 10, type: "application/pdf" })).toThrow(
      /not a CSV/,
    );
    expect(() => validateFile({ name: "x.csv", size: 0 })).toThrow(/empty/);
    expect(() => validateFile({ name: "x.csv", size: MAX_FILE_BYTES + 1 })).toThrow(/10 MB/);
    expect(() => validateFile({ name: "x.csv", size: MAX_FILE_BYTES, type: "text/csv" })).not.toThrow();
  });
});

describe("missing values and duplicates", () => {
  it("treats only blank/whitespace as missing, preserving 0 and false", () => {
    expect(isMissing("")).toBe(true);
    expect(isMissing("   \t")).toBe(true);
    expect(isMissing("0")).toBe(false);
    expect(isMissing("false")).toBe(false);
    expect(isMissing("N/A")).toBe(false);
  });

  it("counts missing cells, exact duplicate rows and completeness", () => {
    const d = ds(
      ["a", "b"],
      [
        ["1", ""],
        ["1", ""],
        ["0", "false"],
        ["1", " "],
        [" ", "x"],
      ],
    );
    expect(countMissingCells(d)).toBe(4);
    expect(countDuplicateRows(d)).toBe(1); // ["1"," "] differs from ["1",""] byte-for-byte
    const m = computeMetrics(d);
    expect(m).toMatchObject({ rows: 5, columns: 2, totalCells: 10, missingCells: 4, duplicateRows: 1 });
    expect(m.completeness).toBe(60);
  });

  it("does not confuse rows whose joined text would collide", () => {
    expect(countDuplicateRows(ds(["a", "b"], [["a,b", "c"], ["a", "b,c"]]))).toBe(0);
  });
});

describe("type inference and profiling", () => {
  it("infers numeric, boolean, date, text and empty", () => {
    expect(inferType(["1", "2.5", "-3", "", "1,200"])).toBe("numeric");
    expect(inferType(["true", "False", "yes"])).toBe("boolean");
    expect(inferType(["2026-01-05", "2026-12-31"])).toBe("date");
    expect(inferType(["2026-02-30"])).toBe("text");
    expect(inferType(["1", "abc"])).toBe("text");
    expect(inferType(["", " "])).toBe("empty");
  });

  it("computes numeric stats ignoring missing values", () => {
    const p = profileColumn(ds(["n"], [["1"], ["2"], [""], ["3"], ["10"]]), 0);
    expect(p.type).toBe("numeric");
    expect(p.missing).toBe(1);
    expect(p.unique).toBe(4);
    expect(p.numeric).toMatchObject({ min: 1, max: 10, mean: 4, median: 2.5, sum: 16 });
  });

  it("builds histogram bins that account for every value", () => {
    const nums = Array.from({ length: 100 }, (_, i) => i);
    const bins = histogram(nums);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(100);
    expect(histogram([5, 5, 5])).toHaveLength(1);
    expect(histogram([0, 1, 1, 6]).map((b) => b.count)).toEqual([1, 2, 0, 0, 0, 0, 1]);
  });

  it("groups the long tail of categories into Other", () => {
    const d = ds(["c"], [["a"], ["a"], ["b"], ["c"], ["d"], [""]]);
    expect(categoryFrequency(d, 0, 2)).toEqual([
      { value: "a", count: 2 },
      { value: "b", count: 1 },
      { value: "Other (2 values)", count: 2 },
    ]);
  });
});

describe("cleaning actions", () => {
  const base = ds(
    ["name", "qty", "flag"],
    [
      [" Ann ", "1", "false"],
      ["Bob", "", "true"],
      [" Ann ", "1", "false"],
      ["Cy", "0", " "],
      ["Dee", "5", "false"],
    ],
  );

  it("trims only the selected columns and does not mutate input", () => {
    const snapshot = JSON.stringify(base);
    const r = trimWhitespace(base, ["name"]);
    expect(r.affected).toBe(2);
    expect(r.data.rows[0]![0]).toBe("Ann");
    expect(r.data.rows[3]![2]).toBe(" "); // flag column untouched
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("removes exact duplicate rows keeping the first occurrence", () => {
    const r = removeDuplicates(base, base.columns);
    expect(r.affected).toBe(1);
    expect(r.data.rows.map((x) => x[0])).toEqual([" Ann ", "Bob", "Cy", "Dee"]);
    const byFlag = removeDuplicates(base, ["flag"]);
    expect(byFlag.data.rows).toHaveLength(3);
  });

  it("drops rows missing any selected column but keeps 0 and false", () => {
    const r = dropMissingRows(base, ["qty", "flag"]);
    expect(r.affected).toBe(2);
    expect(r.data.rows.map((x) => x[0])).toEqual([" Ann ", " Ann ", "Dee"]);
  });

  it("fills with a custom value, mean, or median", () => {
    expect(fillMissing(base, ["qty", "flag"], { kind: "custom", value: "n/a" }).affected).toBe(2);
    const mean = fillMissing(base, ["qty"], { kind: "mean" });
    expect(mean.data.rows[1]![1]).toBe("1.75"); // (1+1+0+5)/4
    const med = fillMissing(base, ["qty"], { kind: "median" });
    expect(med.data.rows[1]![1]).toBe("1");
  });

  it("refuses mean/median on non-numeric columns", () => {
    expect(() => fillMissing(base, ["flag"], { kind: "mean" })).toThrow(/numeric/);
    expect(() => fillMissing(base, ["name"], { kind: "median" })).toThrow(/numeric/);
  });
});

describe("history: undo, revert and reset", () => {
  it("keeps the original baseline immutable while applying and undoing steps", () => {
    const { data } = parseCsvText("a,b\n x ,1\n x ,1\ny,\n");
    let ws = createWorkspace("t.csv", data);
    const t = trimWhitespace(currentData(ws), ["a"]);
    ws = applyStep(ws, { label: "Trim", columns: ["a"], ...t });
    const d = removeDuplicates(currentData(ws), ["a", "b"]);
    ws = applyStep(ws, { label: "Dedupe", columns: ["a", "b"], ...d });
    expect(ws.steps).toHaveLength(2);
    expect(currentData(ws).rows).toEqual([["x", "1"], ["y", ""]]);
    expect(ws.steps[1]!.before.rows).toBe(3);
    expect(ws.steps[1]!.after.rows).toBe(2);
    expect(ws.original.rows[0]).toEqual([" x ", "1"]);
    expect(Object.isFrozen(ws.original.rows[0]!)).toBe(true);

    ws = undo(ws);
    expect(currentData(ws).rows).toHaveLength(3);
    expect(currentData(ws).rows[0]![0]).toBe("x");
    ws = undo(ws);
    expect(currentData(ws)).toBe(ws.original);
    expect(undo(ws)).toBe(ws);
  });

  it("ignores no-op actions and supports revert-to-step and reset", () => {
    let ws = createWorkspace("t.csv", ds(["a"], [["1"], [""], ["1"]]));
    const noop = trimWhitespace(currentData(ws), ["a"]);
    expect(applyStep(ws, { label: "Trim", columns: ["a"], ...noop })).toBe(ws);
    ws = applyStep(ws, { label: "Fill", columns: ["a"], ...fillMissing(currentData(ws), ["a"], { kind: "custom", value: "0" }) });
    const firstId = ws.steps[0]!.id;
    ws = applyStep(ws, { label: "Dedupe", columns: ["a"], ...removeDuplicates(currentData(ws), ["a"]) });
    expect(currentData(revertTo(ws, firstId)).rows).toHaveLength(3);
    expect(currentData(reset(ws))).toBe(ws.original);
  });
});

describe("CSV export round trip", () => {
  it("round-trips quotes, commas, newlines, Unicode and blanks", () => {
    const d = ds(
      ["name", "note", "city"],
      [
        ['Jo "JJ" Smith', "a,b", "Zürich"],
        ["", "line1\nline2", "東京"],
        ["0", "false", " padded "],
      ],
    );
    const csv = toCsv(d, { protectFormulas: false });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(parseCsvText(csv).data).toEqual(d);
  });

  it("neutralises formula-like cells but leaves plain negative numbers alone", () => {
    expect(protectFormula("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(protectFormula("+1 bonus")).toBe("'+1 bonus");
    expect(protectFormula("@cmd")).toBe("'@cmd");
    expect(protectFormula("-12.5")).toBe("-12.5");
    expect(protectFormula("hello")).toBe("hello");
    const csv = toCsv(ds(["x"], [["=1+1"]]), { includeBom: false });
    expect(csv).toBe("x\r\n'=1+1");
  });
});

describe("demo dataset", () => {
  it("parses and contains the advertised mess", () => {
    const { data, warnings } = parseCsvText(DEMO_CSV);
    expect(warnings).toEqual([]);
    expect(data.columns).toHaveLength(12);
    const m = computeMetrics(data);
    expect(m.rows).toBe(64);
    expect(m.duplicateRows).toBeGreaterThanOrEqual(4);
    expect(m.missingCells).toBeGreaterThan(20);
    expect(trimWhitespace(data, data.columns).affected).toBeGreaterThan(0);
  });
});
