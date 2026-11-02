import { useState } from "react";
import type { ColumnProfile } from "@/lib/datapilot/types";
import { formatNumber } from "@/lib/datapilot/analysis";
import { cn } from "@/lib/utils";
import { SectionHeader, TypeBadge, fmt, pct } from "./shared";

export function ProfileView({ profiles, rows }: { profiles: ColumnProfile[]; rows: number }) {
  const [selected, setSelected] = useState(0);
  const p = profiles[Math.min(selected, profiles.length - 1)];

  return (
    <div>
      <SectionHeader
        title="Column profile"
        description="Types are inferred from all non-missing values: a column is numeric, boolean or date only if every value fits. Anything else is text."
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Profile of each column. Select a row for details.</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Column</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Missing</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Unique</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Mean</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((c, i) => (
                <tr key={c.name} className={cn("border-b border-border last:border-0", i === selected && "bg-accent/50")}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-pressed={i === selected}
                      className="max-w-[16rem] truncate text-left font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {c.name}
                    </button>
                  </th>
                  <td className="px-4 py-2"><TypeBadge type={c.type} /></td>
                  <td className={cn("tabular px-4 py-2 text-right", c.missing ? "text-chart-5" : "text-muted-foreground")}>{fmt(c.missing)}</td>
                  <td className="tabular px-4 py-2 text-right">{fmt(c.unique)}</td>
                  <td className="tabular px-4 py-2 text-right text-muted-foreground">{c.numeric ? formatNumber(c.numeric.mean) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {p && (
          <section className="panel h-fit p-5 xl:sticky xl:top-6" aria-labelledby="col-detail" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <h2 id="col-detail" className="truncate text-lg font-semibold">{p.name}</h2>
              <TypeBadge type={p.type} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Filled", `${fmt(p.nonMissing)} / ${fmt(rows)}`],
                ["Missing", `${fmt(p.missing)} (${pct(p.missingPct)})`],
                ["Unique values", fmt(p.unique)],
                ["Numeric share", pct(p.numericShare * 100)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md bg-surface p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="tabular mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {p.type === "text" && p.numericShare >= 0.8 && (
              <p className="mt-3 rounded-md bg-warning/15 p-3 text-xs text-warning-foreground">
                {pct(p.numericShare * 100)} of values are numbers, but some aren't, so this column is treated as text and can't use mean/median fill.
              </p>
            )}
            {p.numeric && (
              <>
                <h3 className="mt-5 text-sm font-semibold">Numeric statistics</h3>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  {(["min", "max", "mean", "median", "std", "sum"] as const).map((k) => (
                    <div key={k} className="rounded-md border border-border p-2">
                      <dt className="text-xs capitalize text-muted-foreground">{k === "std" ? "Std dev" : k}</dt>
                      <dd className="tabular font-medium">{formatNumber(p.numeric![k])}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <h3 className="mt-5 text-sm font-semibold">Most frequent values</h3>
            {p.topValues.length ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {p.topValues.map((t) => (
                  <li key={t.value} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate whitespace-pre" title={t.value}>{t.value}</span>
                    <span className="tabular text-muted-foreground">{fmt(t.count)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No values present.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
