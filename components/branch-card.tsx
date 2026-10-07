import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import type { MachineView, Status } from "@/lib/types";

const segment: Record<Status, string> = {
  online: "bg-online",
  alert: "bg-alert",
  maintenance: "bg-maintenance",
  rebooting: "bg-primary",
  offline: "bg-offline",
};

export function countPhrase(machines: MachineView[]) {
  const parts: Array<[number, string]> = [
    [machines.filter((machine) => machine.status === "online").length, "en línea"],
    [machines.filter((machine) => machine.status === "alert").length, "en alerta"],
    [machines.filter((machine) => machine.status === "offline").length, "sin señal"],
    [machines.filter((machine) => machine.status === "maintenance").length, "en mantenimiento"],
    [machines.filter((machine) => machine.status === "rebooting").length, "reiniciando"],
  ];
  return parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(" · ");
}

export function BranchCard({
  branch,
  machines,
}: {
  branch: MachineView["branch"];
  machines: MachineView[];
}) {
  const total = machines.length || 1;
  const worst = machines.find((machine) => machine.status === "offline")
    ?? machines.find((machine) => machine.status === "alert")
    ?? machines.find((machine) => machine.status === "maintenance")
    ?? machines.find((machine) => machine.status === "rebooting");

  return (
    <Link
      href={`/sucursales/${branch.id}`}
      className="flex flex-col rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition hover:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{branch.city}</p>
          <h2 className="text-2xl">{branch.name}</h2>
        </div>
        {worst ? <StatusPill status={worst.status} /> : <StatusPill status="online" />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{branch.address}</p>
      <p className="mt-3 text-xs">{countPhrase(machines) || "Sin equipos"}</p>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {(["online", "alert", "maintenance", "rebooting", "offline"] as Status[]).map((status) => {
          const count = machines.filter((machine) => machine.status === status).length;
          if (count === 0) return null;
          return (
            <div
              key={status}
              className={segment[status]}
              style={{ width: `${(count / total) * 100}%` }}
            />
          );
        })}
      </div>
    </Link>
  );
}
