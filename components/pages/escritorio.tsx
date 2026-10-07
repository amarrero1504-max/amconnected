"use client";

import Link from "next/link";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { MachineDesktop } from "@/components/machine-desktop";
import { Missing } from "@/components/missing";
import { StatusPill } from "@/components/status-pill";
import { ROLE_LABEL } from "@/lib/labels";

export function Escritorio({ id }: { id: string }) {
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

  return (
    <div>
      <Link href={`/equipos/${machine.id}`} className="text-sm text-primary">
        {machine.name} · {machine.branch.name}
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {ROLE_LABEL[machine.role]} · {machine.branch.city}
          </p>
          <h1 className="mt-1 text-4xl">Escritorio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ves la pantalla de {machine.user}, abres los archivos del equipo y los editas. Lo que guardas queda en la
            bitácora con tu nombre.
          </p>
        </div>
        <StatusPill status={machine.status} />
      </header>
      <div className="mt-6">
        <MachineDesktop machine={machine} />
      </div>
    </div>
  );
}
