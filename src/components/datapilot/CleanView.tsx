import { useMemo, useState } from "react";
import { Copy, Eraser, PaintBucket, Scissors, Undo2 } from "lucide-react";
import type { ColumnProfile, Dataset } from "@/lib/datapilot/types";
import type { HistoryStep } from "@/lib/datapilot/history";
import { invalidNumericFillColumns, type FillStrategy } from "@/lib/datapilot/cleaning";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "./OverviewView";
import { SectionHeader, TypeBadge, fmt } from "./shared";

export type CleanAction =
  | { kind: "trim" }
  | { kind: "dedupe" }
  | { kind: "drop" }
  | { kind: "fill"; strategy: FillStrategy };

function ActionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel flex flex-col p-5" aria-label={title}>
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground [&_svg]:size-4" aria-hidden>{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-auto pt-4">{children}</div>
    </section>
  );
}

export function CleanView({
  data,
  profiles,
  selected,
  setSelected,
  onAction,
  lastStep,
  onUndo,
}: {
  data: Dataset;
  profiles: ColumnProfile[];
  selected: string[];
  setSelected: (cols: string[]) => void;
  onAction: (a: CleanAction) => void;
  lastStep: HistoryStep | null;
  onUndo: () => void;
}) {
  const [fillMode, setFillMode] = useState<"custom" | "mean" | "median">("custom");
  const [fillValue, setFillValue] = useState("");
  const sel = useMemo(() => selected.filter((c) => data.columns.includes(c)), [selected, data.columns]);
  const none = sel.length === 0;
  const label = none ? "Select columns first" : `${sel.length} column${sel.length > 1 ? "s" : ""}`;
  const invalid = useMemo(() => (fillMode === "custom" ? [] : invalidNumericFillColumns(data, sel)), [data, sel, fillMode]);
  const toggle = (c: string) => setSelected(sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c]);
  const quick = [
    { label: "All", cols: data.columns },
    { label: "With missing", cols: profiles.filter((p) => p.missing > 0).map((p) => p.name) },
    { label: "Numeric", cols: profiles.filter((p) => p.type === "numeric").map((p) => p.name) },
    { label: "Text", cols: profiles.filter((p) => p.type === "text").map((p) => p.name) },
    { label: "None", cols: [] as readonly string[] },
  ];
  const fillBlocked = none || (fillMode === "custom" ? fillValue.trim() === "" : invalid.length > 0);

  return (
    <div>
      <SectionHeader
        title="Clean"
        description="Choose the columns to work on, then run an action. Each action creates a history step you can undo. Missing means blank or whitespace-only; 0 and false are kept."
      />

      <fieldset className="panel p-5">
        <legend className="sr-only">Columns to clean</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">1. Select columns</h2>
            <p className="text-sm text-muted-foreground" aria-live="polite">{sel.length} of {data.columns.length} selected</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick selections">
            {quick.map((q) => (
              <Button key={q.label} variant="outline" size="sm" onClick={() => setSelected([...q.cols])} disabled={q.label !== "None" && q.cols.length === 0}>
                {q.label}
              </Button>
            ))}
          </div>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {profiles.map((p) => (
            <li key={p.name}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-surface has-[:checked]:border-primary has-[:checked]:bg-accent/50">
                <input type="checkbox" checked={sel.includes(p.name)} onChange={() => toggle(p.name)} className="size-4" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.missing > 0 && <span className="tabular text-xs text-chart-5" title={`${p.missing} missing`}>{fmt(p.missing)}<span className="sr-only"> missing</span></span>}
                <TypeBadge type={p.type} />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <h2 className="mb-3 mt-8 text-base font-semibold">2. Run an action</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard icon={<Scissors />} title="Trim whitespace" description="Remove leading and trailing spaces, tabs and line breaks from values in the selected columns.">
          <Button className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={none} onClick={() => onAction({ kind: "trim" })}>Trim · {label}</Button>
        </ActionCard>
        <ActionCard icon={<Copy />} title="Remove duplicates" description="Delete rows whose selected-column values exactly match an earlier row. Select all columns for whole-row duplicates. The first occurrence is kept.">
          <Button className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={none} onClick={() => onAction({ kind: "dedupe" })}>Remove duplicates · {label}</Button>
        </ActionCard>
        <ActionCard icon={<Eraser />} title="Drop missing rows" description="Delete every row where any selected column is blank or whitespace-only.">
          <Button className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={none} onClick={() => onAction({ kind: "drop" })}>Drop rows · {label}</Button>
        </ActionCard>
        <ActionCard icon={<PaintBucket />} title="Fill missing" description="Replace blank cells in the selected columns.">
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Fill method</legend>
            {(["custom", "mean", "median"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="fill-mode" value={m} checked={fillMode === m} onChange={() => setFillMode(m)} />
                {m === "custom" ? "Custom value" : m === "mean" ? "Column mean (numeric only)" : "Column median (numeric only)"}
              </label>
            ))}
          </fieldset>
          {fillMode === "custom" && (
            <div className="mt-2">
              <label htmlFor="fill-value" className="sr-only">Custom fill value</label>
              <input
                id="fill-value"
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                placeholder="e.g. Unknown or 0"
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              />
            </div>
          )}
          {invalid.length > 0 && !none && (
            <p className="mt-2 text-xs text-destructive" role="status">
              Not available: {invalid.map((x) => `"${x.column}" ${x.reason}`).join("; ")}.
            </p>
          )}
          <Button
            className="mt-3 h-auto min-h-9 w-full whitespace-normal py-2"
            disabled={fillBlocked}
            onClick={() => onAction({ kind: "fill", strategy: fillMode === "custom" ? { kind: "custom", value: fillValue } : { kind: fillMode } })}
          >
            Fill · {label}
          </Button>
        </ActionCard>
      </div>

      {lastStep && (
        <section className="panel mt-8 p-5" aria-labelledby="last-change">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="last-change" className="text-base font-semibold">Last change: {lastStep.label}</h2>
              <p className="text-sm text-muted-foreground">{lastStep.summary} · {lastStep.columns.length} column{lastStep.columns.length > 1 ? "s" : ""}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onUndo}><Undo2 /> Undo this step</Button>
          </div>
          <div className="mt-3 max-w-xl">
            <ComparisonTable before={lastStep.before} after={lastStep.after} beforeLabel="Before" afterLabel="After" caption="Before and after the last cleaning step" />
          </div>
        </section>
      )}
    </div>
  );
}
