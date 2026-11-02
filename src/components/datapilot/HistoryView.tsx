import { FileText, RotateCcw, Undo2 } from "lucide-react";
import type { HistoryStep } from "@/lib/datapilot/history";
import type { QualityMetrics } from "@/lib/datapilot/types";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeader, fmt, pct } from "./shared";

function MiniDiff({ before, after }: { before: QualityMetrics; after: QualityMetrics }) {
  const items = [
    ["Rows", fmt(before.rows), fmt(after.rows)],
    ["Missing", fmt(before.missingCells), fmt(after.missingCells)],
    ["Duplicates", fmt(before.duplicateRows), fmt(after.duplicateRows)],
    ["Complete", pct(before.completeness), pct(after.completeness)],
  ];
  return (
    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
      {items.map(([k, a, b]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="tabular">
            {a} <span aria-hidden>→</span><span className="sr-only">to</span> <span className={a !== b ? "font-medium text-foreground" : "text-muted-foreground"}>{b}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HistoryView({
  steps,
  fileName,
  original,
  onUndo,
  onReset,
  onRevert,
}: {
  steps: readonly HistoryStep[];
  fileName: string;
  original: QualityMetrics;
  onUndo: () => void;
  onReset: () => void;
  onRevert: (id: number) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="History"
        description="Every cleaning action is recorded with its effect. The original upload is kept untouched as the baseline."
        actions={
          <>
            <Button variant="outline" onClick={onUndo} disabled={!steps.length}><Undo2 /> Undo last</Button>
            <Button variant="outline" onClick={onReset} disabled={!steps.length}><RotateCcw /> Reset to original</Button>
          </>
        }
      />
      <ol className="relative space-y-3 border-l-2 border-border pl-6">
        <li className="relative">
          <span className="absolute -left-[31px] top-4 size-3 rounded-full border-2 border-card bg-chart-3" aria-hidden />
          <div className="panel p-4">
            <p className="flex items-center gap-2 font-medium"><FileText className="size-4 text-muted-foreground" aria-hidden /> Original: {fileName}</p>
            <p className="tabular mt-1 text-xs text-muted-foreground">
              {fmt(original.rows)} rows · {fmt(original.columns)} columns · {fmt(original.missingCells)} missing · {fmt(original.duplicateRows)} duplicates
            </p>
          </div>
        </li>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={s.id} className="relative">
              <span className={`absolute -left-[31px] top-4 size-3 rounded-full border-2 border-card ${isLast ? "bg-primary" : "bg-chart-2"}`} aria-hidden />
              <div className="panel p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="tabular mr-2 text-xs text-muted-foreground">Step {i + 1}</span>
                      {s.label}
                      {isLast && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">current</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{s.summary}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={s.columns.join(", ")}>Columns: {s.columns.join(", ")}</p>
                  </div>
                  {!isLast && (
                    <Button size="sm" variant="ghost" onClick={() => onRevert(s.id)} aria-label={`Revert to step ${i + 1}, ${s.label}`}>
                      Revert to here
                    </Button>
                  )}
                </div>
                <MiniDiff before={s.before} after={s.after} />
              </div>
            </li>
          );
        })}
      </ol>
      {!steps.length && (
        <div className="mt-6">
          <EmptyState title="No cleaning steps yet">Actions you run on the Clean page will appear here with before/after numbers.</EmptyState>
        </div>
      )}
    </div>
  );
}
