import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Hash, CheckCircle2 } from "lucide-react";
import type { ColumnProfile, Dataset } from "@/lib/datapilot/types";
import { categoryFrequency, histogram, missingByColumn, numericValues } from "@/lib/datapilot/analysis";
import { EmptyState, SectionHeader, fmt, pct } from "./shared";

function ChartPanel({
  id,
  title,
  description,
  controls,
  summary,
  table,
  children,
}: {
  id: string;
  title: string;
  description: string;
  controls?: ReactNode;
  summary: string;
  table: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel p-5" aria-labelledby={`${id}-title`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={`${id}-title`} className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {controls}
      </div>
      <figure className="mt-4">
        <div role="img" aria-label={summary}>{children}</div>
        <figcaption className="mt-2 text-xs text-muted-foreground">{summary}</figcaption>
      </figure>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer rounded text-primary hover:underline">View chart data as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-border">{table}</div>
      </details>
    </section>
  );
}

function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-surface">
        <tr>{headers.map((h, i) => <th key={h} scope="col" className={`px-3 py-1.5 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-t border-border">
            {r.map((v, i) => i === 0
              ? <th key={i} scope="row" className="px-3 py-1 text-left font-normal">{v}</th>
              : <td key={i} className="tabular px-3 py-1 text-right">{typeof v === "number" ? fmt(v) : v}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ColumnSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 max-w-[14rem] rounded-md border border-input bg-card px-2">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = { borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--card)" };

export function ChartsView({ data, profiles }: { data: Dataset; profiles: ColumnProfile[] }) {
  const numericCols = profiles.filter((p) => p.type === "numeric").map((p) => p.name);
  const categoryCols = profiles.filter((p) => p.type !== "empty").map((p) => p.name);
  const defaultCat = profiles.find((p) => p.type === "text" && p.unique <= 30)?.name ?? categoryCols[0] ?? "";
  const [numCol, setNumCol] = useState(numericCols[0] ?? "");
  const [catCol, setCatCol] = useState(defaultCat);
  const activeNum = numericCols.includes(numCol) ? numCol : numericCols[0] ?? "";
  const activeCat = categoryCols.includes(catCol) ? catCol : defaultCat;

  const missing = useMemo(() => missingByColumn(data), [data]);
  const totalMissing = missing.reduce((a, b) => a + b.missing, 0);
  const hist = useMemo(() => (activeNum ? histogram(numericValues(data, data.columns.indexOf(activeNum))) : []), [data, activeNum]);
  const freq = useMemo(() => (activeCat ? categoryFrequency(data, data.columns.indexOf(activeCat)) : []), [data, activeCat]);
  const worstMissing = [...missing].sort((a, b) => b.missing - a.missing)[0];
  const topCat = freq[0];
  const peak = [...hist].sort((a, b) => b.count - a.count)[0];

  return (
    <div>
      <SectionHeader title="Charts" description="All charts are computed live from the current data and update after every cleaning step or undo." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <ChartPanel
            id="missing"
            title="Missing values by column"
            description="Count of blank or whitespace-only cells in each column."
            summary={totalMissing && worstMissing ? `${fmt(totalMissing)} missing cells in total. Most in "${worstMissing.column}" with ${fmt(worstMissing.missing)} (${pct(worstMissing.pct)}).` : "No missing cells in any column."}
            table={<DataTable caption="Missing values by column" headers={["Column", "Missing", "% of rows"]} rows={missing.map((m) => [m.column, m.missing, pct(m.pct)])} />}
          >
            {totalMissing === 0 ? (
              <EmptyState icon={<CheckCircle2 />} title="No missing values">Every cell in every column has a value.</EmptyState>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missing} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="column" tick={axis} interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={axis} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [fmt(v), "Missing"]} />
                    <Bar dataKey="missing" fill="var(--chart-5)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>
        </div>

        <ChartPanel
          id="hist"
          title="Numeric distribution"
          description="Histogram of values in a numeric column."
          controls={numericCols.length > 0 && <ColumnSelect id="hist-col" label="Column" value={activeNum} options={numericCols} onChange={setNumCol} />}
          summary={hist.length && peak ? `${activeNum}: ${fmt(hist.reduce((a, b) => a + b.count, 0))} values in ${hist.length} bins. Most common range ${peak.label} (${fmt(peak.count)}).` : "No numeric column available to chart."}
          table={<DataTable caption={`Histogram of ${activeNum}`} headers={["Range", "Count"]} rows={hist.map((h) => [h.label, h.count])} />}
        >
          {hist.length === 0 ? (
            <EmptyState icon={<Hash />} title="No numeric columns">
              A column is numeric only when every non-missing value is a number. Try trimming whitespace or check the profile for mixed columns.
            </EmptyState>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barCategoryGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
                  <YAxis tick={axis} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [fmt(v), "Rows"]} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          id="freq"
          title="Category frequency"
          description="Most common values (top 12, rest grouped as Other)."
          controls={categoryCols.length > 0 && <ColumnSelect id="freq-col" label="Column" value={activeCat} options={categoryCols} onChange={setCatCol} />}
          summary={freq.length && topCat ? `${activeCat}: most frequent value "${topCat.value}" appears ${fmt(topCat.count)} times. ${freq.length} bars shown.` : "No values to count."}
          table={<DataTable caption={`Frequency of ${activeCat}`} headers={["Value", "Count"]} rows={freq.map((f) => [f.value, f.count])} />}
        >
          {freq.length === 0 ? (
            <EmptyState icon={<BarChart3 />} title="Nothing to count">The selected column has no non-missing values.</EmptyState>
          ) : (
            <div style={{ height: Math.max(160, freq.length * 28 + 24) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freq} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="value" tick={axis} width={130} tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [fmt(v), "Rows"]} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
