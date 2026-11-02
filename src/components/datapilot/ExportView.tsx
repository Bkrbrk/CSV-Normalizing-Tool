import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import type { Dataset } from "@/lib/datapilot/types";
import { countProtectedCells, downloadText, toCsv } from "@/lib/datapilot/csv";
import { Button } from "@/components/ui/button";
import { SectionHeader, fmt } from "./shared";
import { toast } from "sonner";

export function cleanedName(fileName: string) {
  return fileName.replace(/\.(csv|txt|tsv)$/i, "") + "-cleaned.csv";
}

export function ExportView({ data, original, fileName, steps }: { data: Dataset; original: Dataset; fileName: string; steps: number }) {
  const [name, setName] = useState(cleanedName(fileName));
  const [protect, setProtect] = useState(true);
  const [bom, setBom] = useState(true);
  const risky = useMemo(() => countProtectedCells(data), [data]);
  const preview = useMemo(
    () => toCsv({ columns: data.columns, rows: data.rows.slice(0, 8) }, { protectFormulas: protect, includeBom: false }),
    [data, protect],
  );
  const safeName = (name.trim() || "datapilot-export").replace(/[\\/:*?"<>|]/g, "_");
  const finalName = safeName.toLowerCase().endsWith(".csv") ? safeName : `${safeName}.csv`;

  const download = (d: Dataset, filename: string) => {
    downloadText(toCsv(d, { protectFormulas: protect, includeBom: bom }), filename);
    toast.success(`Downloaded ${filename}`, { description: `${fmt(d.rows.length)} rows × ${fmt(d.columns.length)} columns` });
  };

  return (
    <div>
      <SectionHeader title="Export" description="Download the current cleaned data as a standards-compliant CSV file. The file is generated in your browser." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="panel p-5" aria-labelledby="export-opts">
          <h2 id="export-opts" className="text-base font-semibold">Export settings</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <label htmlFor="export-name" className="font-medium">File name</label>
              <input id="export-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" />
            </div>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={protect} onChange={(e) => setProtect(e.target.checked)} className="mt-0.5 size-4" />
              <span>
                <span className="font-medium">Protect against spreadsheet formulas</span>
                <span className="block text-muted-foreground">
                  Cells starting with = + − @, tab or carriage return are prefixed with an apostrophe (') so Excel, Sheets or Numbers won't run them as formulas. Plain numbers like −12.5 are left alone.{" "}
                  <span className="font-medium text-foreground">{fmt(risky)} cell{risky === 1 ? "" : "s"}</span> affected in this data.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={bom} onChange={(e) => setBom(e.target.checked)} className="mt-0.5 size-4" />
              <span>
                <span className="font-medium">Add UTF-8 byte order mark</span>
                <span className="block text-muted-foreground">Helps Excel show accented and non-Latin characters correctly. Turn off for tools that dislike a BOM.</span>
              </span>
            </label>
            <p className="flex items-start gap-2 rounded-md bg-surface p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              UTF-8 encoding, comma separated, CRLF line endings. Fields containing commas, quotes or line breaks are quoted and inner quotes doubled (RFC 4180).
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => download(data, finalName)}><Download /> Download cleaned CSV</Button>
            <Button variant="outline" onClick={() => download(original, finalName.replace(/-cleaned\.csv$|\.csv$/i, "") + "-original.csv")}>Download original</Button>
          </div>
          <p className="tabular mt-3 text-xs text-muted-foreground">
            {fmt(data.rows.length)} rows × {fmt(data.columns.length)} columns · {steps} cleaning step{steps === 1 ? "" : "s"} applied
          </p>
        </section>
        <section className="panel min-w-0 p-5" aria-labelledby="export-preview">
          <h2 id="export-preview" className="text-base font-semibold">Preview</h2>
          <p className="text-sm text-muted-foreground">First {Math.min(8, data.rows.length)} rows exactly as they will be written.</p>
          <pre tabIndex={0} aria-label="CSV preview" className="tabular mt-3 max-h-96 overflow-auto rounded-md bg-sidebar p-4 text-xs leading-relaxed text-sidebar-foreground">
            {preview || "(no rows)"}
          </pre>
        </section>
      </div>
    </div>
  );
}
