"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatClock, formatRelative } from "@/lib/format";
import type { LogTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass: Record<LogTone, string> = {
  info: "bg-primary",
  ok: "bg-online",
  warn: "bg-alert",
  bad: "bg-offline",
};

export function Bitacora() {
  const fleet = useFleet();
  const [open, setOpen] = useState(false);
  if (!fleet.ready) return <FleetSkeleton />;

  const now = fleet.now;

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Actividad</p>
          <h1 className="mt-1 text-4xl">Registros</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada escritorio que abres, archivo que editas, reinicio, bloqueo y corte de señal queda anotado con el
            nombre de quien opera.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Restaurar demo
        </Button>
      </header>

      {fleet.logs.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Todavía no hay movimientos. Cuando mandes una orden, queda anotada aquí.
        </p>
      ) : (
        <ol className="mt-6">
          {fleet.logs.map((entry) => (
            <li key={entry.id} className="flex gap-3 border-b border-border/80 py-4">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneClass[entry.tone])} aria-hidden />
              <div>
                <p className="text-sm">{entry.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelative(entry.at, now)} · {formatClock(new Date(entry.at))}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar la flota de ejemplo</DialogTitle>
            <DialogDescription>
              Se borran las órdenes y la bitácora de esta demo, y vuelven las sucursales como al empezar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button
              onClick={() => {
                fleet.reset();
                setOpen(false);
                toast.success("Listo. La flota volvió al ejemplo.");
              }}
            >
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
