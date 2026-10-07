import { STATUS_LABEL } from "@/lib/labels";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const tone: Record<Status, string> = {
  online: "text-online",
  offline: "text-offline",
  alert: "text-alert",
  maintenance: "text-maintenance",
  rebooting: "text-primary",
};

const dot: Record<Status, string> = {
  online: "bg-online dot-live",
  offline: "bg-offline",
  alert: "bg-alert",
  maintenance: "bg-maintenance",
  rebooting: "bg-primary dot-live",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium", tone[status])}>
      <span className={cn("size-1.5 rounded-full", dot[status])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
