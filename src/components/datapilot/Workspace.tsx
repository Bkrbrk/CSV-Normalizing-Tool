import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, Download, FileSpreadsheet, HelpCircle, History, LayoutDashboard, Lock, Menu, RotateCcw,
  Table2, Undo2, Upload, Wand2, ListTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CsvError, downloadText, parseCsvFile, parseCsvText } from "@/lib/datapilot/csv";
import { profileDataset } from "@/lib/datapilot/analysis";
import { dropMissingRows, fillMissing, removeDuplicates, trimWhitespace } from "@/lib/datapilot/cleaning";
import {
  applyStep, createWorkspace, currentData, currentMetrics, reset, revertTo, undo, type Workspace as WS,
} from "@/lib/datapilot/history";
import { DEMO_CSV, DEMO_FILENAME } from "@/lib/datapilot/demo";
import type { View } from "./nav";
import { WelcomeView } from "./WelcomeView";
import { OverviewView } from "./OverviewView";
import { DataView } from "./DataView";
import { ProfileView } from "./ProfileView";
import { CleanView, type CleanAction } from "./CleanView";
import { ChartsView } from "./ChartsView";
import { HistoryView } from "./HistoryView";
import { ExportView } from "./ExportView";
import { HelpView } from "./HelpView";
import { FileDrop } from "./FileDrop";
import { fmt } from "./shared";

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
  { id: "data", label: "Data", icon: <Table2 /> },
  { id: "profile", label: "Profile", icon: <ListTree /> },
  { id: "clean", label: "Clean", icon: <Wand2 /> },
  { id: "charts", label: "Charts", icon: <BarChart3 /> },
  { id: "history", label: "History", icon: <History /> },
  { id: "export", label: "Export", icon: <Download /> },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-accent text-primary-foreground shadow-lift" aria-hidden>
        <FileSpreadsheet className="size-4" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-sidebar-accent-foreground" style={{ fontFamily: "var(--font-display)" }}>
        Data<span className="text-sidebar-primary">Pilot</span>
      </span>
    </div>
  );
}

function SidebarContent({
  view, go, ws, onDownloadDemo,
}: { view: View; go: (v: View) => void; ws: WS | null; onDownloadDemo: () => void }) {
  const steps = ws?.steps.length ?? 0;
  return (
    <div className="dot-grid flex h-full flex-col bg-sidebar p-4 text-sidebar-foreground">
      <Brand />
      {ws && (
        <div className="mt-6 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/70">Dataset</p>
          <p className="mt-1 truncate text-sm font-medium text-sidebar-accent-foreground" title={ws.fileName}>{ws.fileName}</p>
          <p className="tabular mt-0.5 text-xs">{fmt(currentData(ws).rows.length)} rows · {fmt(ws.original.columns.length)} cols</p>
        </div>
      )}
      <nav aria-label="Workspace" className="mt-6 flex-1">
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => go(n.id)}
                aria-current={view === n.id ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                  view === n.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                    : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <span className={view === n.id ? "text-sidebar-primary" : ""} aria-hidden>{n.icon}</span>
                {n.label}
                {n.id === "history" && steps > 0 && (
                  <span className="tabular ml-auto rounded-full bg-sidebar-primary px-1.5 text-[11px] text-sidebar-primary-foreground">{steps}<span className="sr-only"> steps</span></span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-sidebar-border pt-4">
          <button
            type="button"
            onClick={() => go("help")}
            aria-current={view === "help" ? "page" : undefined}
            className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
              view === "help" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}
          >
            <HelpCircle aria-hidden /> Help & privacy
          </button>
          <button type="button" onClick={onDownloadDemo} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&_svg]:size-4">
            <Download aria-hidden /> Download demo CSV
          </button>
        </div>
      </nav>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-sidebar-border p-3 text-xs">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-sidebar-primary" aria-hidden />
        <span>Processed locally in your browser. Nothing is uploaded.</span>
      </div>
    </div>
  );
}

export function Workspace() {
  const [ws, setWs] = useState<WS | null>(null);
  const [view, setView] = useState<View>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const data = ws ? currentData(ws) : null;
  const metrics = ws ? currentMetrics(ws) : null;
  const profiles = useMemo(() => (data ? profileDataset(data) : []), [data]);

  const go = useCallback((v: View) => {
    setView(v);
    setMenuOpen(false);
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  const load = useCallback((name: string, parsed: ReturnType<typeof parseCsvText>) => {
    setWs(createWorkspace(name, parsed.data, parsed.warnings));
    setSelected([]);
    setError(null);
    setReplaceOpen(false);
    setView("overview");
    toast.success(`Loaded ${name}`, {
      description: `${fmt(parsed.data.rows.length)} rows × ${parsed.data.columns.length} columns${parsed.warnings.length ? ` · ${parsed.warnings.length} warning(s)` : ""}`,
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      load(file.name, await parseCsvFile(file));
    } catch (e) {
      const msg = e instanceof CsvError ? e.message : `Could not read "${file.name}". ${(e as Error).message ?? ""}`;
      setError(msg);
      toast.error("File not loaded", { description: msg });
    } finally {
      setBusy(false);
    }
  }, [load]);

  const loadDemo = useCallback(() => load(DEMO_FILENAME, parseCsvText(DEMO_CSV)), [load]);
  const downloadDemo = useCallback(() => {
    downloadText(DEMO_CSV, DEMO_FILENAME);
    toast.success(`Downloaded ${DEMO_FILENAME}`);
  }, []);

  const doUndo = useCallback(() => {
    setWs((w) => {
      if (!w || !w.steps.length) return w;
      toast(`Undid: ${w.steps[w.steps.length - 1]!.label}`);
      return undo(w);
    });
  }, []);

  const runAction = (a: CleanAction) => {
    if (!ws || !data) return;
    const cols = selected.filter((c) => data.columns.includes(c));
    try {
      const result =
        a.kind === "trim" ? trimWhitespace(data, cols)
        : a.kind === "dedupe" ? removeDuplicates(data, cols)
        : a.kind === "drop" ? dropMissingRows(data, cols)
        : fillMissing(data, cols, a.strategy);
      const label = { trim: "Trim whitespace", dedupe: "Remove duplicates", drop: "Drop missing rows", fill: "Fill missing" }[a.kind];
      if (result.affected === 0) {
        toast.info("Nothing to change", { description: `${label}: no matching cells or rows in the selected columns. History unchanged.` });
        return;
      }
      setWs(applyStep(ws, { label, columns: cols, ...result }));
      toast.success(result.summary, { action: { label: "Undo", onClick: doUndo } });
    } catch (e) {
      toast.error("Action not applied", { description: (e as Error).message });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      doUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo]);

  const steps = ws?.steps.length ?? 0;
  const showWelcome = !ws && view !== "help";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>

      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent view={view} go={go} ws={ws} onDownloadDemo={downloadDemo} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></Button>
            <div className="min-w-0 flex-1">
              {ws ? (
                <p className="truncate text-sm">
                  <span className="font-medium">{ws.fileName}</span>
                  <span className="tabular ml-2 hidden text-muted-foreground sm:inline">
                    {steps ? `${steps} step${steps > 1 ? "s" : ""} applied` : "original"}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground lg:hidden">DataPilot</p>
              )}
            </div>
            {ws && (
              <>
                <Button variant="outline" size="sm" onClick={doUndo} disabled={!steps} aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl/⌘+Z)">
                  <Undo2 /> <span className="hidden sm:inline">Undo</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)} disabled={!steps}>
                  <RotateCcw /> <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button size="sm" onClick={() => setReplaceOpen(true)}>
                  <Upload /> <span className="hidden sm:inline">New file</span>
                </Button>
              </>
            )}
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
          {showWelcome ? (
            <WelcomeView onFile={handleFile} onLoadDemo={loadDemo} onDownloadDemo={downloadDemo} busy={busy} error={error} />
          ) : view === "help" ? (
            <HelpView />
          ) : ws && data && metrics ? (
            view === "overview" ? (
              <OverviewView metrics={metrics} original={ws.originalMetrics} profiles={profiles} steps={ws.steps} warnings={ws.warnings} fileName={ws.fileName} go={go} />
            ) : view === "data" ? (
              <DataView original={ws.original} current={data} profiles={profiles} hasChanges={steps > 0} />
            ) : view === "profile" ? (
              <ProfileView profiles={profiles} rows={data.rows.length} />
            ) : view === "clean" ? (
              <CleanView data={data} profiles={profiles} selected={selected} setSelected={setSelected} onAction={runAction} lastStep={ws.steps[steps - 1] ?? null} onUndo={doUndo} />
            ) : view === "charts" ? (
              <ChartsView data={data} profiles={profiles} />
            ) : view === "history" ? (
              <HistoryView steps={ws.steps} fileName={ws.fileName} original={ws.originalMetrics} onUndo={doUndo} onReset={() => setConfirmReset(true)} onRevert={(id) => { setWs(revertTo(ws, id)); toast("Reverted to selected step"); }} />
            ) : (
              <ExportView key={ws.fileName} data={data} original={ws.original} fileName={ws.fileName} steps={steps} />
            )
          ) : null}
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Move between DataPilot sections</SheetDescription>
          <SidebarContent view={view} go={go} ws={ws} onDownloadDemo={downloadDemo} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to original?</AlertDialogTitle>
            <AlertDialogDescription>
              This discards all {steps} cleaning step{steps === 1 ? "" : "s"} and restores the data exactly as uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setWs((w) => (w ? reset(w) : w)); toast("Reset to original data"); }}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={replaceOpen} onOpenChange={(o) => { setReplaceOpen(o); if (!o) setError(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Open another dataset</AlertDialogTitle>
            <AlertDialogDescription>
              The current data and its history will be replaced. {steps > 0 && "Export first if you want to keep your cleaned version."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FileDrop onFile={handleFile} busy={busy} compact />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={loadDemo}>Load demo instead</Button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
