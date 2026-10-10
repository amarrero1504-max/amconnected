"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { Button } from "@/components/ui/button";
import { DESK_BODY_LIMIT, deskBlock } from "@/lib/desk";
import type { MachineView } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Archivos() {
  const fleet = useFleet();
  const params = useSearchParams();
  const requested = params.get("equipo") ?? "";
  const [manual, setManual] = useState<{ id: string; requested: string } | null>(null);
  const [filePick, setFilePick] = useState<{ machineId: string; fileId: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!fleet.ready) return <FleetSkeleton />;

  const machines = [...fleet.views].sort((a, b) => labelOf(a).localeCompare(labelOf(b), "es"));
  const selectedId = (manual && manual.requested === requested ? manual.id : requested) || machines[0]?.id;
  const machine = machines.find((item) => item.id === selectedId) ?? machines[0];

  return (
    <div>
      <div className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-xl font-medium text-slate-800">Acceso a archivos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Abre los archivos de trabajo de un equipo y edítalos. Cada guardado queda en los registros.
        </p>
      </div>

      {!machine ? (
        <p className="px-4 py-8 text-sm md:px-6">Todavía no hay equipos.</p>
      ) : (
        <div className="grid min-h-[28rem] md:grid-cols-[18rem_minmax(0,1fr)]">
          <ul className="max-h-72 overflow-auto border-b border-border md:max-h-[calc(100dvh-8rem)] md:border-r md:border-b-0">
            {machines.map((item) => {
              const active = item.id === machine.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setManual({ id: item.id, requested })}
                    className={cn(
                      "flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-slate-50",
                      active && "bg-[#e7eef6] text-[#1578c9]",
                    )}
                  >
                    <span className="font-medium">{labelOf(item)}</span>
                    <span className={cn("text-xs", active ? "text-[#1578c9]/80" : "text-slate-500")}>
                      {item.files.length} archivos
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <FilePane
            machine={machine}
            fileId={filePick && filePick.machineId === machine.id ? filePick.fileId : (machine.files[0]?.id ?? "")}
            onPick={(fileId) => setFilePick({ machineId: machine.id, fileId })}
            onDraft={(fileId, body) => setDrafts((current) => ({ ...current, [`${machine.id}:${fileId}`]: body }))}
            draftFor={(fileId, fallback) => drafts[`${machine.id}:${fileId}`] ?? fallback}
          />
        </div>
      )}
    </div>
  );
}

function FilePane({
  machine,
  fileId,
  onPick,
  onDraft,
  draftFor,
}: {
  machine: MachineView;
  fileId: string;
  onPick: (fileId: string) => void;
  onDraft: (fileId: string, body: string) => void;
  draftFor: (fileId: string, fallback: string) => string;
}) {
  const fleet = useFleet();
  const file = machine.files.find((item) => item.id === fileId) ?? machine.files[0];
  const block = deskBlock(machine);
  const draft = file ? draftFor(file.id, file.body) : "";
  const dirty = file ? draft !== file.body : false;

  function addNote() {
    const result = fleet.createNote(machine.id);
    if (!result.ok || !result.fileId) {
      toast.error(result.ok ? "No pude crear la nota." : result.error);
      return;
    }
    onPick(result.fileId);
    toast.success("Nota nueva en el equipo.");
  }

  function save() {
    if (!file) return;
    const result = fleet.saveFile(machine.id, file.id, draft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDraft(file.id, draft);
    toast.success(`«${file.name}» quedó en ${machine.name}.`);
  }

  return (
    <div className="flex min-h-[24rem] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{labelOf(machine)}</p>
        <Button size="sm" variant="outline" disabled={Boolean(block)} onClick={addNote}>
          Nueva nota
        </Button>
      </div>
      {block ? <p className="bg-slate-50 px-4 py-2 text-sm text-slate-600">{block} Puedes leer lo último que había.</p> : null}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ul className="border-b border-border md:w-52 md:border-r md:border-b-0">
          {machine.files.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item.id)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-slate-50",
                  file?.id === item.id && "bg-[#e7eef6] font-medium text-[#1578c9]",
                )}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
        {file ? (
          <div className="flex min-h-64 flex-1 flex-col">
            <label className="min-h-0 flex-1">
              <span className="sr-only">Contenido de {file.name}</span>
              <textarea
                className="h-full min-h-64 w-full resize-none p-4 font-mono text-sm leading-6 outline-none"
                value={draft}
                maxLength={DESK_BODY_LIMIT}
                onChange={(event) => onDraft(file.id, event.target.value)}
              />
            </label>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2">
              <p className="text-xs text-slate-500">
                {dirty ? "Sin guardar" : "Guardado"} · {draft.length}/{DESK_BODY_LIMIT}
              </p>
              <Button size="sm" disabled={!dirty || Boolean(block)} onClick={save}>
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-500">Este equipo no tiene archivos.</p>
        )}
      </div>
    </div>
  );
}

function labelOf(machine: MachineView) {
  return `${machine.name} ${machine.branch.name}`;
}
