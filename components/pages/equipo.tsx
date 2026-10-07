"use client";

import Link from "next/link";
import { CommandList } from "@/components/command-list";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { MachineActions } from "@/components/machine-actions";
import { buttonVariants } from "@/components/ui/button";
import { MetricBar, metricTone } from "@/components/metric-bar";
import { Missing } from "@/components/missing";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative, formatRemaining, formatUptime, telHref } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";

export function Equipo({ id }: { id: string }) {
  const fleet = useFleet();
  if (!fleet.ready) return <FleetSkeleton />;

  const machine = fleet.views.find((item) => item.id === id);
  if (!machine) {
    return (
      <Missing
        title="Ese equipo no está"
        body="Revisa el listado. Puede que el nombre haya cambiado o que el enlace esté incompleto."
        href="/equipos"
        action="Volver a equipos"
      />
    );
  }

  const now = fleet.now;
  const history = fleet.commands.filter((command) => command.machineId === machine.id).slice(0, 8);

  return (
    <div>
      <Link href={`/sucursales/${machine.branch.id}`} className="text-sm text-primary">
        {machine.branch.name}
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {ROLE_LABEL[machine.role]} · {machine.branch.city}
          </p>
          <h1 className="mt-1 text-4xl">{machine.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sesión {machine.user} · visto {formatRelative(machine.lastSeen, now)}
          </p>
        </div>
        <StatusPill status={machine.status} />
      </header>

      {machine.issue ? (
        <p className="mt-5 rounded-2xl bg-alert/15 px-4 py-3 text-sm">{machine.issue}</p>
      ) : null}
      {machine.note ? <p className="mt-3 text-sm text-muted-foreground">{machine.note}</p> : null}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
        <div className="max-w-xl">
          <h2 className="text-xl">Escritorio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La pantalla de {machine.user}, los archivos del equipo y un lugar para editarlos.
          </p>
        </div>
        <Link
          href={`/equipos/${machine.id}/escritorio`}
          className={buttonVariants()}
          onClick={() => fleet.openDesktop(machine.id)}
        >
          Abrir escritorio
        </Link>
      </section>

      {machine.screenNotice ? (
        <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
          <p className="text-xs tracking-[0.14em] text-primary uppercase">Aviso en pantalla</p>
          <p className="mt-1 text-xl">«{machine.screenNotice.text}»</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sigue en pantalla {formatRemaining(machine.screenNotice.until, now)}.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <Card>
          <CardContent className="space-y-4">
            <MetricBar label="Disco" value={machine.disk} tone={metricTone(machine.disk, 70, 88)} />
            <MetricBar label="Procesador" value={machine.cpu} tone={metricTone(machine.cpu, 70, 90)} />
            <MetricBar label="Memoria" value={machine.ram} tone={metricTone(machine.ram, 75, 90)} />
            <dl className="grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <Fact label="Sistema" value={machine.os} />
              <Fact label="Dirección" value={machine.ip} />
              <Fact label="Encendido" value={formatUptime(machine.uptimeHours)} />
              <Fact label="Sucursal" value={machine.branch.name} />
              <Fact label="A cargo" value={machine.branch.manager} />
              <div>
                <dt className="text-xs text-muted-foreground">Teléfono del local</dt>
                <dd>
                  <a className="text-primary" href={telHref(machine.branch.phone)}>
                    {machine.branch.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-xl">Órdenes</h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Reinicio, bloqueo, aviso e inventario. El escritorio está arriba.
            </p>
            <MachineActions machine={machine} />
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl">Historial de este equipo</h2>
        <div className="mt-3 rounded-2xl bg-card px-4 ring-1 ring-foreground/10">
          <CommandList commands={history} now={now} empty="Todavía no hay órdenes para este equipo." />
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
