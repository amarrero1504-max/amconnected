"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { useFleet } from "@/components/fleet-provider";
import type { CommandKind, MachineView } from "@/lib/types";

type DialogKind = "restart" | "lock" | "message" | "maintenance_on" | "maintenance_off" | "signal" | "disk" | null;

export function MachineActions({ machine }: { machine: MachineView }) {
  const { enqueue, registerSignal, registerDiskCleanup } = useFleet();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const blocked = machine.rebooting || machine.maintenance;
  const offline = machine.link === "down";
  const suggestion =
    machine.disk >= 88
      ? `Liberen espacio en ${machine.name}. El disco va en ${Math.round(machine.disk)}% y la caja se puede trabar.`
      : `Revisen ${machine.name}: el procesador va en ${Math.round(machine.cpu)}% y está lento.`;

  function openDialog(next: Exclude<DialogKind, null>, preset = "") {
    setError(null);
    setDraft(preset);
    setDialog(next);
  }

  function closeDialog() {
    setDialog(null);
    setError(null);
  }

  function finish(result: { ok: true; queued: boolean } | { ok: false; error: string }, success: string) {
    if (!result.ok) {
      setError(result.error);
      if (dialog === null) toast.error(result.error);
      return;
    }
    toast.success(result.queued ? "Quedó en cola. Se aplica cuando vuelva la señal." : success);
    closeDialog();
  }

  function send(kind: CommandKind, message?: string) {
    finish(enqueue({ machineId: machine.id, kind, message }), "Orden enviada.");
  }

  const hint = machine.rebooting
    ? "Está reiniciando. Las órdenes vuelven cuando encienda."
    : machine.maintenance
      ? "En mantenimiento solo puedes quitar el mantenimiento."
      : offline
        ? "Sin señal: el reinicio y el inventario esperan en cola. El escritorio, el bloqueo y el aviso necesitan una sesión."
        : null;

  return (
    <div className="space-y-3">
      {machine.status === "offline" ? (
        <Button className="w-full" onClick={() => openDialog("signal")}>
          Registrar señal
        </Button>
      ) : null}
      {machine.disk >= 88 && !blocked && !offline ? (
        <div className="grid gap-2">
          <Button variant="secondary" className="w-full" onClick={() => openDialog("message", suggestion)}>
            Avisar a la sucursal
          </Button>
          <Button variant="outline" className="w-full" onClick={() => openDialog("disk")}>
            Registrar limpieza de disco
          </Button>
        </div>
      ) : null}
      {machine.cpu >= 90 && machine.disk < 88 && !blocked && !offline ? (
        <Button variant="secondary" className="w-full" onClick={() => openDialog("message", suggestion)}>
          Avisar a la sucursal
        </Button>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button disabled={blocked} onClick={() => openDialog("restart")}>
          Reiniciar
        </Button>
        <Button variant="outline" disabled={blocked || offline} onClick={() => openDialog("lock")}>
          Bloquear sesión
        </Button>
        <Button variant="outline" disabled={blocked || offline} onClick={() => openDialog("message")}>
          Aviso en pantalla
        </Button>
        <Button variant="outline" disabled={blocked} onClick={() => send("inventory")}>
          Pedir inventario
        </Button>
      </div>

      {machine.maintenance ? (
        <Button variant="secondary" className="w-full" disabled={machine.rebooting} onClick={() => openDialog("maintenance_off")}>
          Quitar mantenimiento
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled={machine.rebooting} onClick={() => openDialog("maintenance_on")}>
          Poner en mantenimiento
        </Button>
      )}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titleFor(dialog, machine)}</DialogTitle>
            <DialogDescription>{bodyFor(dialog, machine)}</DialogDescription>
          </DialogHeader>
          {dialog === "message" ? (
            <div className="space-y-1">
              <Textarea
                value={draft}
                maxLength={180}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ej. Cierra esta caja a las 9. El equipo se reinicia a las 9:10."
                aria-label="Texto del aviso"
              />
              <p className="text-right text-xs text-muted-foreground">{draft.trim().length}/180</p>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => confirm(dialog, draft, machine, send, registerSignal, registerDiskCleanup, finish)}>
              {confirmLabel(dialog)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function confirm(
  dialog: DialogKind,
  draft: string,
  machine: MachineView,
  send: (kind: CommandKind, message?: string) => void,
  registerSignal: (machineId: string) => { ok: true; queued: boolean } | { ok: false; error: string },
  registerDiskCleanup: (machineId: string) => { ok: true; queued: boolean } | { ok: false; error: string },
  finish: (result: { ok: true; queued: boolean } | { ok: false; error: string }, success: string) => void,
) {
  if (dialog === "restart") send("restart");
  if (dialog === "lock") send("lock");
  if (dialog === "message") send("message", draft);
  if (dialog === "maintenance_on") send("maintenance_on");
  if (dialog === "maintenance_off") send("maintenance_off");
  if (dialog === "signal") finish(registerSignal(machine.id), `${machine.name} ya figura en línea.`);
  if (dialog === "disk") finish(registerDiskCleanup(machine.id), "Disco actualizado.");
}

function titleFor(dialog: DialogKind, machine: MachineView) {
  switch (dialog) {
    case "restart":
      return `Reiniciar ${machine.name}`;
    case "lock":
      return `Bloquear ${machine.name}`;
    case "message":
      return `Aviso en ${machine.name}`;
    case "maintenance_on":
      return `Mantenimiento en ${machine.name}`;
    case "maintenance_off":
      return `Sacar ${machine.name} de mantenimiento`;
    case "signal":
      return `Registrar señal de ${machine.name}`;
    case "disk":
      return `Limpieza de disco en ${machine.name}`;
    default:
      return "";
  }
}

function bodyFor(dialog: DialogKind, machine: MachineView) {
  switch (dialog) {
    case "restart":
      return machine.link === "down"
        ? `${machine.name} no tiene señal. La orden espera y se aplica cuando vuelva a reportar.`
        : `Se reinicia ${machine.name} en ${machine.branch.name}. La caja se queda sin sistema unos segundos.`;
    case "lock":
      return `Quien esté en la sesión ${machine.user} va a ver el bloqueo de Windows y tiene que volver a entrar.`;
    case "message":
      return `El texto aparece en la pantalla de ${machine.name} unos minutos. No muestra lo que escribe el cajero.`;
    case "maintenance_on":
      return "El equipo sigue encendido, pero desde aquí no le llegan reinicios, bloqueos ni avisos hasta que lo saques.";
    case "maintenance_off":
      return "Vuelve a aceptar órdenes de la mesa de control.";
    case "signal":
      return `Úsalo solo si alguien en ${machine.branch.name} confirmó que ${machine.name} ya tiene internet.`;
    case "disk":
      return "Úsalo cuando la sucursal confirme que borró temporales o respaldos viejos. Desde aquí no se borra nada.";
    default:
      return "";
  }
}

function confirmLabel(dialog: DialogKind) {
  switch (dialog) {
    case "restart":
      return "Reiniciar";
    case "lock":
      return "Bloquear";
    case "message":
      return "Mostrar aviso";
    case "maintenance_on":
      return "Poner en mantenimiento";
    case "maintenance_off":
      return "Quitar mantenimiento";
    case "signal":
      return "Registrar señal";
    case "disk":
      return "Registrar limpieza";
    default:
      return "Confirmar";
  }
}
