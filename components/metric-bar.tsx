import { cn } from "@/lib/utils";

export function MetricBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad";
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "ok" && "bg-online",
            tone === "warn" && "bg-alert",
            tone === "bad" && "bg-offline",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function metricTone(value: number, warnAt: number, badAt: number): "ok" | "warn" | "bad" {
  if (value >= badAt) return "bad";
  if (value >= warnAt) return "warn";
  return "ok";
}
