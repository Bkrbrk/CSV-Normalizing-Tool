import { Keyboard, Lock, Info, AlertCircle } from "lucide-react";
import { SectionHeader } from "./shared";

export function HelpView() {
  return (
    <div className="max-w-3xl">
      <SectionHeader title="Help & privacy" description="How DataPilot works, what it assumes, and where its limits are." />
      <div className="space-y-4">
        <section className="panel p-5" aria-labelledby="h-privacy">
          <h2 id="h-privacy" className="flex items-center gap-2 text-base font-semibold"><Lock className="size-4 text-primary" aria-hidden /> Local processing</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your file is read with the browser's File API and parsed, profiled, cleaned and exported in this tab. No data is uploaded, logged or stored on a server, and there is no account. Reloading or closing the tab discards everything, so export before you leave.
          </p>
        </section>
        <section className="panel p-5" aria-labelledby="h-rules">
          <h2 id="h-rules" className="flex items-center gap-2 text-base font-semibold"><Info className="size-4 text-primary" aria-hidden /> Rules DataPilot follows</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">Missing</span> means a cell is empty or contains only whitespace. Values like <code>0</code>, <code>false</code>, <code>N/A</code> or <code>null</code> are real values and are kept.</li>
            <li><span className="font-medium text-foreground">Duplicate rows</span> are rows identical to an earlier row in every cell, character for character. " North" and "North" differ until you trim.</li>
            <li><span className="font-medium text-foreground">Types</span> are inferred from non-missing values: numeric (e.g. 12, −3.5, 1,200), boolean (true/false/yes/no), date (YYYY-MM-DD, YYYY/MM/DD, M/D/YYYY), otherwise text.</li>
            <li><span className="font-medium text-foreground">Mean/median fill</span> is only offered for numeric columns and is rounded to 4 decimals.</li>
            <li>The <span className="font-medium text-foreground">original</span> data is never modified. Undo removes the last step; Reset returns to the original.</li>
          </ul>
        </section>
        <section className="panel p-5" aria-labelledby="h-keys">
          <h2 id="h-keys" className="flex items-center gap-2 text-base font-semibold"><Keyboard className="size-4 text-primary" aria-hidden /> Keyboard</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li><kbd className="tabular rounded border border-border bg-surface px-1.5">Tab</kbd> moves through every control; focused items show a teal outline.</li>
            <li><kbd className="tabular rounded border border-border bg-surface px-1.5">Ctrl/⌘ + Z</kbd> undoes the last cleaning step (when not typing in a field).</li>
            <li>Scrollable tables can be focused and scrolled with arrow keys. Every chart has a "View chart data as a table" option.</li>
          </ul>
        </section>
        <section className="panel p-5" aria-labelledby="h-limits">
          <h2 id="h-limits" className="flex items-center gap-2 text-base font-semibold"><AlertCircle className="size-4 text-primary" aria-hidden /> Limitations</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Files up to 10 MB. Very wide or long files may feel slow because each history step keeps a snapshot in memory.</li>
            <li>Files are decoded as UTF-8. Other encodings (e.g. Windows-1252) may show replacement characters; you'll get a warning.</li>
            <li>The delimiter is auto-detected (comma, semicolon, tab, pipe); the first row is always treated as the header.</li>
            <li>Data is not saved between sessions.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
