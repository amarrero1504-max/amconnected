"use client";

import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { MachineDesktop } from "@/components/machine-desktop";
import { Missing } from "@/components/missing";

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
      <h1 className="sr-only">
        Sesión de {machine.user} en {machine.name}
      </h1>
      <MachineDesktop machine={machine} />
    </div>
  );
}
