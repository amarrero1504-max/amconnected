"use client";

import Link from "next/link";
import { BranchCard } from "@/components/branch-card";
import { CommandList } from "@/components/command-list";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { greeting } from "@/lib/format";
import { sortBranches } from "@/lib/fleet";
import type { Status } from "@/lib/types";

const rank: Record<Status, number> = {
  offline: 0,
  rebooting: 1,
  alert: 2,
  maintenance: 3,
  online: 4,
};

export function Panel() {
  const fleet = useFleet();
  if (!fleet.ready) return <FleetSkeleton />;

  const now = fleet.now;
  const hello = greeting(new Date(now));
  const attention = fleet.views
    .filter((machine) => machine.status === "offline" || machine.status === "alert" || machine.status === "rebooting")
    .sort((a, b) => rank[a.status] - rank[b.status] || a.branch.name.localeCompare(b.branch.name, "es"));
  const active = fleet.commands.filter((command) => command.status === "queued" || command.status === "running");
  const names = new Map(fleet.views.map((machine) => [machine.id, `${machine.name} · ${machine.branch.name}`]));
  const branches = sortBranches(fleet.branches);

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Mesa de control</p>
        <h1 className="mt-1 text-4xl text-balance">{hello}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Operas como {fleet.operator}. {fleet.stats.branches} sucursales y {fleet.stats.total} equipos.
          Desde aquí reinicias, bloqueas la sesión, dejas un aviso o pides el inventario. Vigía no abre el escritorio
          ni ve lo que escriben.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href="/equipos?estado=linea" label="En línea" value={fleet.stats.online} detail={`de ${fleet.stats.total}`} tone="text-online" />
        <Stat href="/equipos?estado=sin-senal" label="Sin señal" value={fleet.stats.offline} detail="hay que revisar" tone="text-offline" />
        <Stat href="/equipos?estado=alerta" label="En alerta" value={fleet.stats.alert} detail="disco o procesador" tone="text-alert" />
        <Stat href="/equipos?estado=mantenimiento" label="Mantenimiento" value={fleet.stats.maintenance} detail="trabajo en tienda" tone="text-maintenance" />
      </section>
      {fleet.stats.rebooting > 0 ? (
        <p className="mt-3 text-sm text-primary">
          {fleet.stats.rebooting === 1 ? "1 equipo se está reiniciando." : `${fleet.stats.rebooting} equipos se están reiniciando.`}
        </p>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-2xl">Qué necesita atención</h2>
            <Link href="/equipos" className="text-sm text-primary">
              Ver equipos
            </Link>
          </div>
          {attention.length === 0 ? (
            <div className="rounded-2xl bg-card px-4 py-6 ring-1 ring-foreground/10">
              <p className="text-sm">Todas las cajas responden. No hay equipos detenidos ni con el disco lleno.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {attention.map((machine) => (
                <li key={machine.id}>
                  <Link
                    href={`/equipos/${machine.id}`}
                    className="block rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition hover:ring-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {machine.name}
                          <span className="font-normal text-muted-foreground"> · {machine.branch.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {machine.branch.city}
                        </p>
                      </div>
                      <StatusPill status={machine.status} />
                    </div>
                    {machine.issue ? <p className="mt-2 text-sm">{machine.issue}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-2xl">Órdenes en camino</h2>
            <Link href="/bitacora" className="text-sm text-primary">
              Bitácora
            </Link>
          </div>
          <Card>
            <CardContent>
              <CommandList
                commands={active}
                names={names}
                now={now}
                empty="No hay órdenes en camino. Elige un equipo y manda la primera."
              />
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl">Sucursales</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {branches.map((branch) => {
            const machines = fleet.views.filter((machine) => machine.branchId === branch.id);
            return <BranchCard key={branch.id} branch={branch} machines={machines} />;
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  detail,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <Link href={href} className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full">
        <CardContent>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-4xl tabular-nums ${tone}`}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
