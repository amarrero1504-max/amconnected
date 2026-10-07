"use client";

import Link from "next/link";
import { countPhrase } from "@/components/branch-card";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { Missing } from "@/components/missing";
import { StatusPill } from "@/components/status-pill";
import { ROLE_LABEL } from "@/lib/labels";
import { formatRelative, telHref } from "@/lib/format";

export function Sucursal({ id }: { id: string }) {
  const fleet = useFleet();
  if (!fleet.ready) return <FleetSkeleton />;

  const branch = fleet.branches.find((item) => item.id === id);
  if (!branch) {
    return (
      <Missing
        title="Esa sucursal no está"
        body="Puede que el enlace esté viejo. Las ocho sucursales de la cadena siguen en el listado."
        href="/sucursales"
        action="Volver a sucursales"
      />
    );
  }

  const now = fleet.now;
  const machines = fleet.views
    .filter((machine) => machine.branchId === branch.id)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const calm = machines.every((machine) => machine.status === "online");

  return (
    <div>
      <Link href="/sucursales" className="text-sm text-primary">
        Todas las sucursales
      </Link>
      <header className="mt-3 max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{branch.city}</p>
        <h1 className="mt-1 text-4xl">{branch.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{branch.address}</p>
        <p className="mt-3 text-sm">
          A cargo de {branch.manager}
          {" · "}
          <a className="text-primary" href={telHref(branch.phone)}>
            {branch.phone}
          </a>
          {" · "}
          {branch.hours}
        </p>
        <p className="mt-2 text-sm">{countPhrase(machines)}</p>
      </header>

      {calm ? (
        <p className="mt-6 rounded-2xl bg-online/10 px-4 py-3 text-sm text-online">
          Esta sucursal está al corriente. Todos los equipos responden.
        </p>
      ) : null}

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        {machines.map((machine) => (
          <li key={machine.id}>
            <Link href={`/equipos/${machine.id}`} className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-accent/60">
              <div className="min-w-0">
                <p className="font-medium">{machine.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABEL[machine.role]} · {machine.user} · visto {formatRelative(machine.lastSeen, now)}
                </p>
                {machine.issue ? <p className="mt-1 text-sm">{machine.issue}</p> : null}
                {machine.note ? <p className="mt-1 text-sm text-muted-foreground">{machine.note}</p> : null}
              </div>
              <StatusPill status={machine.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
