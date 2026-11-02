import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ColumnType } from "@/lib/datapilot/types";

const TYPE_STYLES: Record<ColumnType, string> = {
  numeric: "bg-accent text-accent-foreground",
  text: "bg-secondary text-secondary-foreground",
  boolean: "bg-warning/20 text-warning-foreground",
  date: "bg-chart-3/10 text-chart-3",
  empty: "bg-muted text-muted-foreground",
};

export function TypeBadge({ type, className }: { type: ColumnType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        TYPE_STYLES[type],
        className,
      )}
    >
      {type}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Delta({ value, goodWhen, suffix = "" }: { value: number; goodWhen: "up" | "down" | "none"; suffix?: string | undefined }) {
  if (Math.abs(value) < 1e-9) return <span className="text-xs text-muted-foreground">no change</span>;
  const good = goodWhen === "none" ? null : goodWhen === "up" ? value > 0 : value < 0;
  const text = `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 1 })}${suffix}`;
  return (
    <span
      className={cn(
        "tabular text-xs font-medium",
        good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
      )}
    >
      {text} <span className="sr-only">versus original</span>
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="[&_svg]:size-4" aria-hidden>
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-2xl font-medium text-foreground">{value}</span>
        {delta}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const fmt = (n: number) => n.toLocaleString("en-US");
export const pct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
