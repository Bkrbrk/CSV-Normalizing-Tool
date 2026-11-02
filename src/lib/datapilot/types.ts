/** A tabular dataset. All cells are kept as raw strings so nothing is silently coerced. */
export interface Dataset {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export type ColumnType = "numeric" | "text" | "boolean" | "date" | "empty";

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  sum: number;
}

export interface ColumnProfile {
  name: string;
  index: number;
  type: ColumnType;
  nonMissing: number;
  missing: number;
  missingPct: number;
  unique: number;
  /** Share of non-missing values that parse as numbers (0–1). */
  numericShare: number;
  numeric: NumericStats | null;
  topValues: { value: string; count: number }[];
}

export interface QualityMetrics {
  rows: number;
  columns: number;
  totalCells: number;
  missingCells: number;
  duplicateRows: number;
  /** Percent of non-missing cells, 0–100. 100 for an empty table. */
  completeness: number;
}
