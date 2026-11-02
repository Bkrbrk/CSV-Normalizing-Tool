import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import type { ColumnProfile, Dataset } from "@/lib/datapilot/types";
import { isMissing } from "@/lib/datapilot/analysis";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeader, TypeBadge, fmt } from "./shared";

const PAGE_SIZES = [25, 50, 100];

function Cell({ value }: { value: string }) {
  if (isMissing(value)) {
    return (
      <span className="rounded bg-chart-5/10 px-1.5 py-0.5 text-[11px] font-medium text-chart-5">
        {value.length ? "blank·ws" : "empty"}
      </span>
    );
  }
  const padded = value !== value.trim();
  return (
    <span
      className={cn("whitespace-pre", padded && "rounded bg-warning/20 outline outline-1 outline-warning/60")}
      title={padded ? "Has leading or trailing whitespace" : value.length > 40 ? value : undefined}
    >
      {value.length > 60 ? `${value.slice(0, 60)}…` : value}
      {padded && <span className="sr-only"> (has surrounding whitespace)</span>}
    </span>
  );
}

export function DataView({
  original,
  current,
  profiles,
  hasChanges,
}: {
  original: Dataset;
  current: Dataset;
  profiles: ColumnProfile[];
  hasChanges: boolean;
}) {
  const [mode, setMode] = useState<"current" | "original">("current");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const deferred = useDeferredValue(query);
  const data = mode === "current" ? current : original;

  const rows = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const indexed = data.rows.map((r, i) => ({ r, i }));
    if (!q) return indexed;
    return indexed.filter(({ r }) => r.some((v) => v.toLowerCase().includes(q)));
  }, [data, deferred]);

  useEffect(() => setPage(0), [deferred, mode, pageSize, data]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div>
      <SectionHeader
        title="Data"
        description="Browse and search every row. Missing cells are tagged; cells with stray whitespace are highlighted."
      />
      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Which version to show" className="inline-flex rounded-md bg-muted p-1">
            {(["current", "original"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium capitalize transition-colors",
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
                {m === "current" && hasChanges && <span className="ml-1 text-primary" aria-label="(edited)">•</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-2 md:max-w-sm">
            <label htmlFor="table-search" className="sr-only">Search all cells</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="table-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all cells…"
                className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-8 text-sm placeholder:text-muted-foreground"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {fmt(rows.length)} matching rows. Page {safePage + 1} of {pages}.
        </p>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title={data.rows.length ? "No rows match your search" : "This version has no rows"}>
              {data.rows.length ? "Try a different term or clear the search." : "All rows were removed by cleaning. Undo a step to restore them."}
            </EmptyState>
          </div>
        ) : (
          <div className="relative max-h-[60vh] overflow-auto" tabIndex={0} role="region" aria-label={`${mode} data table, scrollable`}>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <caption className="sr-only">{mode === "current" ? "Current cleaned data" : "Original uploaded data"}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-20 border-b border-border bg-surface px-3 py-2 text-right text-xs font-medium text-muted-foreground">#</th>
                  {data.columns.map((c, i) => (
                    <th key={c} scope="col" className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2 text-left align-bottom">
                      <div className="flex flex-col gap-1">
                        {mode === "current" && profiles[i] && <TypeBadge type={profiles[i].type} className="self-start" />}
                        <span className="whitespace-nowrap font-medium text-foreground">{c}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ r, i }) => (
                  <tr key={i} className="hover:bg-accent/40">
                    <td className="tabular sticky left-0 border-b border-border bg-card px-3 py-1.5 text-right text-xs text-muted-foreground">{i + 1}</td>
                    {data.columns.map((c, ci) => (
                      <td key={c} className="max-w-[22rem] overflow-hidden text-ellipsis border-b border-border px-3 py-1.5">
                        <Cell value={r[ci] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="tabular">
              {rows.length ? `${fmt(safePage * pageSize + 1)}–${fmt(Math.min(rows.length, (safePage + 1) * pageSize))}` : "0"} of {fmt(rows.length)}
              {deferred && ` (filtered from ${fmt(data.rows.length)})`}
            </span>
            <label htmlFor="page-size" className="ml-2">Rows per page</label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-card px-2 text-foreground"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <nav aria-label="Table pagination" className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="First page" disabled={safePage === 0} onClick={() => setPage(0)}><ChevronsLeft /></Button>
            <Button variant="outline" size="icon" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft /></Button>
            <span className="tabular px-2 text-muted-foreground">Page {safePage + 1} / {pages}</span>
            <Button variant="outline" size="icon" aria-label="Next page" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}><ChevronRight /></Button>
            <Button variant="outline" size="icon" aria-label="Last page" disabled={safePage >= pages - 1} onClick={() => setPage(pages - 1)}><ChevronsRight /></Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
