import { Download, Lock, Sparkles, Table2, Wand2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDrop } from "./FileDrop";

export function WelcomeView({
  onFile,
  onLoadDemo,
  onDownloadDemo,
  busy,
  error,
}: {
  onFile: (f: File) => void;
  onLoadDemo: () => void;
  onDownloadDemo: () => void;
  busy: boolean;
  error: string | null;
}) {
  const steps = [
    { icon: <Table2 />, title: "Load", text: "Open a CSV or the messy retail demo. Inspect it in the table." },
    { icon: <Sparkles />, title: "Profile", text: "See types, missing cells, duplicates and stats per column." },
    { icon: <Wand2 />, title: "Clean", text: "Trim, de-duplicate, drop or fill. Every step can be undone." },
    { icon: <BarChart3 />, title: "Export", text: "Chart the result and download a safe, cleaned CSV." },
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Welcome to DataPilot</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
        Clean and understand your CSV in minutes.
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        A focused workspace for tidying spreadsheets exports. Start with the built-in demo to see how it works, or
        open your own file.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <FileDrop onFile={onFile} busy={busy} />
          {error && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>
        <div className="panel flex flex-col p-5">
          <h2 className="text-base font-semibold">Try the demo dataset</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            64 retail orders with stray spaces, blank cells, duplicate rows, quoted notes with line breaks, Unicode
            store names and a formula-like cell.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button onClick={onLoadDemo} disabled={busy}>
              <Sparkles /> Load demo
            </Button>
            <Button variant="outline" onClick={onDownloadDemo}>
              <Download /> Download demo CSV
            </Button>
          </div>
        </div>
      </div>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="panel p-4">
            <div className="flex items-center gap-2 text-primary [&_svg]:size-4">
              {s.icon}
              <span className="tabular text-xs text-muted-foreground">0{i + 1}</span>
            </div>
            <p className="mt-2 font-medium">{s.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Private by design.</span> Files are read and processed
          entirely in this browser tab. Nothing is uploaded, stored on a server or sent anywhere. Closing or
          reloading the tab clears the data.
        </p>
      </div>
    </div>
  );
}
