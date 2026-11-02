import { useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDrop({
  onFile,
  busy,
  compact = false,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = e.dataTransfer.files;
    const first = files[0];
    if (first) onFile(first);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
        compact ? "px-4 py-6" : "px-6 py-12",
        over ? "border-primary bg-accent" : "border-input bg-surface hover:border-primary/60",
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <FileUp className="size-5" aria-hidden />}
      </div>
      <p className="font-medium text-foreground">
        {busy ? "Reading file…" : over ? "Drop to open" : "Drag & drop a CSV file here"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">UTF-8 .csv up to 10 MB · first row is the header</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-50"
      >
        Choose file…
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a CSV file"
        data-testid="file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
