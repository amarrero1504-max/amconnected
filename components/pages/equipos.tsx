"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderOpen, Monitor } from "lucide-react";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { SearchField } from "@/components/search-field";
import { deskBlock } from "@/lib/desk";
import { fold, formatAccess } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { MachineView, Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "Equipos" },
  { id: "online", label: "En línea" },
  { id: "offline", label: "Desconectados" },
  { id: "alert", label: "En alerta" },
  { id: "maintenance", label: "Mantenimiento" },
  { id: "rebooting", label: "Reiniciando" },
] as const;

type FilterId = (typeof filters)[number]["id"];

const fromQuery: Record<string, FilterId> = {
  "sin-senal": "offline",
  alerta: "alert",
  mantenimiento: "maintenance",
  reiniciando: "rebooting",
  linea: "online",
};

function matches(machine: MachineView, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "online") return machine.status === "online";
  return machine.status === filter;
}

function lineLabel(status: Status) {
  if (status === "offline") return "Desconectado";
  if (status === "online") return "En línea";
  if (status === "alert") return "En alerta";
  return STATUS_LABEL[status];
}

export function Equipos() {
  const fleet = useFleet();
  const params = useSearchParams();
  const estado = params.get("estado") ?? "";
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState<{ filter: FilterId; estado: string } | null>(null);
  const filter = manual && manual.estado === estado ? manual.filter : (fromQuery[estado] ?? "all");

  if (!fleet.ready) return <FleetSkeleton />;

  const now = fleet.now;
  const machines = fleet.views
    .filter((machine) => matches(machine, filter))
    .filter((machine) => {
      if (!query) return true;
      const haystack = fold(
        [machine.name, machine.user, machine.ip, machine.branch.name, machine.branch.city, ROLE_LABEL[machine.role]].join(
          " ",
        ),
      );
      return haystack.includes(fold(query));
    })
    .sort((a, b) => labelOf(a).localeCompare(labelOf(b), "es"));

  return (
    <div>
      <div className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-xl font-medium text-slate-800">Equipos</h1>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
        <p className="text-sm text-slate-600">
          Equipos utilizados: <span className="font-medium text-slate-800">{fleet.stats.total}</span>
        </p>
        <label className="text-sm text-slate-600">
          <span className="sr-only">Filtrar equipos</span>
          <select
            value={filter}
            onChange={(event) => setManual({ filter: event.target.value as FilterId, estado })}
            className="h-8 rounded-md border border-border bg-white px-2 text-sm"
          >
            {filters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:ml-auto md:w-64">
          <SearchField id="buscar-equipos" value={query} onChange={setQuery} placeholder="Buscar" />
        </div>
      </div>

      <div className="px-4 pb-2 text-right md:px-6">
        <button type="button" className="text-sm text-[#1578c9] hover:underline" onClick={() => downloadList(machines, now)}>
          Exportar lista de equipos
        </button>
      </div>

      {machines.length === 0 ? (
        <div className="mx-4 mb-6 rounded-md border border-border px-4 py-8 md:mx-6">
          <p className="text-sm">{query ? <>Ningún equipo coincide con «{query}».</> : "No hay equipos en este filtro."}</p>
          <button
            type="button"
            className="mt-3 text-sm text-[#1578c9]"
            onClick={() => {
              setQuery("");
              setManual({ filter: "all", estado });
            }}
          >
            Ver todos los equipos
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-t border-border text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium md:px-6">Nombre del equipo</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Fecha de acceso</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Archivos</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => {
                const reachable = deskBlock(machine) === null;
                return (
                  <tr key={machine.id} className="border-b border-border/80 hover:bg-slate-50">
                    <td className="px-4 py-2.5 md:px-6">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center text-[#1578c9]">
                          <Monitor className="size-5" aria-hidden />
                        </span>
                        <Link href={`/equipos/${machine.id}`} className="min-w-0 font-medium text-slate-800 hover:underline">
                          {labelOf(machine)}
                        </Link>
                        {reachable ? (
                          <Link
                            href={`/equipos/${machine.id}/escritorio`}
                            onClick={() => fleet.openDesktop(machine.id)}
                            className="ml-1 inline-flex h-7 items-center rounded border border-[#1578c9] px-3 text-xs font-medium text-[#1578c9] hover:bg-blue-50"
                          >
                            Conectar
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          machine.status === "offline" || machine.status === "rebooting"
                            ? "text-slate-500"
                            : machine.status === "alert"
                              ? "text-alert"
                              : machine.status === "maintenance"
                                ? "text-maintenance"
                                : "text-online",
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            machine.status === "offline" || machine.status === "rebooting"
                              ? "bg-slate-400"
                              : machine.status === "alert"
                                ? "bg-alert"
                                : machine.status === "maintenance"
                                  ? "bg-maintenance"
                                  : "bg-online",
                          )}
                          aria-hidden
                        />
                        {lineLabel(machine.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatAccess(machine.lastSeen, now)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/archivos?equipo=${machine.id}`}
                        aria-label={`Archivos de ${labelOf(machine)}`}
                        className="inline-flex text-[#1578c9] hover:text-[#0f5fa3]"
                      >
                        <FolderOpen className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function labelOf(machine: MachineView) {
  return `${machine.name} ${machine.branch.name}`;
}

function downloadList(machines: MachineView[], now: number) {
  const header = ["Equipo", "Sucursal", "Ciudad", "Estado", "Ultimo acceso", "Usuario", "IP"];
  const rows = machines.map((machine) => [
    machine.name,
    machine.branch.name,
    machine.branch.city,
    lineLabel(machine.status),
    formatAccess(machine.lastSeen, now),
    machine.user,
    machine.ip,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "equipos-vigia.csv";
  link.click();
  URL.revokeObjectURL(url);
}
