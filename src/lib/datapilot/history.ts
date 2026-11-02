import { computeMetrics } from "./analysis";
import type { Dataset, QualityMetrics } from "./types";

export interface HistoryStep {
  id: number;
  label: string;
  summary: string;
  columns: readonly string[];
  data: Dataset;
  before: QualityMetrics;
  after: QualityMetrics;
  at: number;
}

export interface Workspace {
  fileName: string;
  /** Immutable baseline exactly as parsed. Never modified by cleaning. */
  original: Dataset;
  originalMetrics: QualityMetrics;
  steps: readonly HistoryStep[];
  warnings: readonly string[];
}

function freeze(data: Dataset): Dataset {
  for (const r of data.rows) Object.freeze(r);
  Object.freeze(data.rows);
  Object.freeze(data.columns);
  return Object.freeze(data);
}

export function createWorkspace(fileName: string, data: Dataset, warnings: string[] = []): Workspace {
  const original = freeze({ columns: [...data.columns], rows: data.rows.map((r) => [...r]) });
  return { fileName, original, originalMetrics: computeMetrics(original), steps: [], warnings };
}

export function currentData(ws: Workspace): Dataset {
  return ws.steps.length ? ws.steps[ws.steps.length - 1]!.data : ws.original;
}

export function currentMetrics(ws: Workspace): QualityMetrics {
  return ws.steps.length ? ws.steps[ws.steps.length - 1]!.after : ws.originalMetrics;
}

let nextId = 1;

/** Appends a step. Returns the same workspace if `affected` is 0 so no-op actions don't clutter history. */
export function applyStep(
  ws: Workspace,
  step: { label: string; summary: string; columns: readonly string[]; data: Dataset; affected: number },
): Workspace {
  if (step.affected === 0) return ws;
  const data = freeze(step.data);
  return {
    ...ws,
    steps: [
      ...ws.steps,
      {
        id: nextId++,
        label: step.label,
        summary: step.summary,
        columns: step.columns,
        data,
        before: currentMetrics(ws),
        after: computeMetrics(data),
        at: Date.now(),
      },
    ],
  };
}

export function undo(ws: Workspace): Workspace {
  if (!ws.steps.length) return ws;
  return { ...ws, steps: ws.steps.slice(0, -1) };
}

/** Reverts to the state right after the step with the given id (drops later steps). */
export function revertTo(ws: Workspace, stepId: number): Workspace {
  const i = ws.steps.findIndex((s) => s.id === stepId);
  if (i < 0) return ws;
  return { ...ws, steps: ws.steps.slice(0, i + 1) };
}

export function reset(ws: Workspace): Workspace {
  return { ...ws, steps: [] };
}
