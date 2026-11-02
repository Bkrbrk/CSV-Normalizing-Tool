import { AlertTriangle, Columns3, Copy, Gauge, Rows3, SquareDashed } from "lucide-react";
import type { ColumnProfile, QualityMetrics } from "@/lib/datapilot/types";
import type { HistoryStep } from "@/lib/datapilot/history";
import { Button } from "@/components/ui/button";
import { Delta, MetricCard, SectionHeader, TypeBadge, fmt, pct } from "./shared";
import type { View } from "./nav";

export function ComparisonTable({ before, after, beforeLabel, afterLabel, caption }: {
  before: QualityMetrics;
  after: QualityMetrics;
  beforeLabel: string;
  afterLabel: string;
  caption: string;
}) {
  const rows: { label: string; a: string; b: string; d: number; good: "up" | "down"; suffix?: string }[] = [
    { label: "Rows", a: fmt(before.rows), b: fmt(after.rows), d: after.rows - before.rows, good: "up" },
    { label: "Missing cells", a: fmt(before.missingCells), b: fmt(after.missingCells), d: after.missingCells - before.missingCells, good: "down" },
    { label: "Duplicate rows", a: fmt(before.duplicateRows), b: fmt(after.duplicateRows), d: after.duplicateRows - before.duplicateRows, good: "down" },
    { label: "Completeness", a: pct(before.completeness), b: pct(after.completeness), d: after.completeness - before.completeness, good: "up", suffix: " pts" },
  ];
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <th scope="col" className="py-2 font-medium">Metric</th>
          <th scope="col" className="py-2 text-right font-medium">{beforeLabel}</th>
          <th scope="col" className="py-2 text-right font-medium">{afterLabel}</th>
          <th scope="col" className="py-2 text-right font-medium">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-border">
            <th scope="row" className="py-2 text-left font-normal">{r.label}</th>
            <td className="tabular py-2 text-right">{r.a}</td>
            <td className="tabular py-2 text-right font-medium">{r.b}</td>
            <td className="py-2 text-right">
              {r.label === "Rows" ? <Delta value={r.d} goodWhen="none" /> : <Delta value={r.d} goodWhen={r.good} suffix={r.suffix} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OverviewView({
  metrics,
  original,
  profiles,
  steps,
  warnings,
  fileName,
  go,
}: {
  metrics: QualityMetrics;
  original: QualityMetrics;
  profiles: ColumnProfile[];
  steps: readonly HistoryStep[];
  warnings: readonly string[];
  fileName: string;
  go: (v: View) => void;
}) {
  const worst = [...profiles].filter((p) => p.missing > 0).sort((a, b) => b.missing - a.missing).slice(0, 5);
  const typeCounts = profiles.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + 1 }), {});
  const suggestions: { text: string; view: View }[] = [];
  if (metrics.duplicateRows) suggestions.push({ text: `${fmt(metrics.duplicateRows)} exact duplicate rows can be removed.`, view: "clean" });
  if (metrics.missingCells) suggestions.push({ text: `${fmt(metrics.missingCells)} missing cells across ${worst.length === 5 ? "5+" : worst.length} columns.`, view: "clean" });
  if (!suggestions.length) suggestions.push({ text: "No missing cells or duplicate rows detected. Ready to export.", view: "export" });

  return (
    <div>
      <SectionHeader
        title="Overview"
        description={<>Quality metrics for the current version of <span className="font-medium text-foreground">{fileName}</span>, compared with the original upload.</>}
      />

      {warnings.length > 0 && (
        <div role="status" className="mb-6 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-warning-foreground">
            <AlertTriangle className="size-4" aria-hidden /> Parsed with {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-1 list-disc pl-6 text-warning-foreground">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Rows" icon={<Rows3 />} value={fmt(metrics.rows)} delta={<Delta value={metrics.rows - original.rows} goodWhen="none" />} />
        <MetricCard label="Columns" icon={<Columns3 />} value={fmt(metrics.columns)} hint={Object.entries(typeCounts).map(([t, n]) => `${n} ${t}`).join(" · ")} />
        <MetricCard label="Missing cells" icon={<SquareDashed />} value={fmt(metrics.missingCells)} delta={<Delta value={metrics.missingCells - original.missingCells} goodWhen="down" />} hint="Blank or whitespace-only" />
        <MetricCard label="Duplicate rows" icon={<Copy />} value={fmt(metrics.duplicateRows)} delta={<Delta value={metrics.duplicateRows - original.duplicateRows} goodWhen="down" />} hint="Exact repeats of an earlier row" />
        <MetricCard label="Completeness" icon={<Gauge />} value={pct(metrics.completeness)} delta={<Delta value={metrics.completeness - original.completeness} goodWhen="up" suffix=" pts" />} hint={`${fmt(metrics.totalCells - metrics.missingCells)} of ${fmt(metrics.totalCells)} cells filled`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="cmp-title">
          <h2 id="cmp-title" className="text-base font-semibold">Original vs current</h2>
          <p className="mb-3 text-sm text-muted-foreground">{steps.length ? `${steps.length} cleaning step${steps.length > 1 ? "s" : ""} applied.` : "No cleaning applied yet."}</p>
          <ComparisonTable before={original} after={metrics} beforeLabel="Original" afterLabel="Current" caption="Original versus current data quality" />
        </section>

        <section className="panel p-5" aria-labelledby="next-title">
          <h2 id="next-title" className="text-base font-semibold">Suggested next steps</h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => (
              <li key={s.text} className="flex items-center justify-between gap-3 rounded-md bg-surface p-3 text-sm">
                <span>{s.text}</span>
                <Button size="sm" variant="outline" onClick={() => go(s.view)}>{s.view === "clean" ? "Clean" : "Export"}</Button>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold">Columns with most missing values</h3>
          {worst.length ? (
            <ul className="mt-2 space-y-2">
              {worst.map((p) => (
                <li key={p.name} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2"><span className="truncate">{p.name}</span><TypeBadge type={p.type} /></span>
                    <span className="tabular text-muted-foreground">{fmt(p.missing)} · {pct(p.missingPct)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-chart-5" style={{ width: `${Math.max(2, p.missingPct)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Every column is fully populated.</p>
          )}
        </section>
      </div>
    </div>
  );
}
