"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { SearchField } from "@/components/search-field";
import { StatusPill } from "@/components/status-pill";
import { fold, formatRelative } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "Todos" },
  { id: "offline", label: "Sin señal" },
  { id: "alert", label: "Alerta" },
  { id: "maintenance", label: "Mantenimiento" },
  { id: "rebooting", label: "Reiniciando" },
  { id: "online", label: "En línea" },
] as const;

type FilterId = (typeof filters)[number]["id"];

const fromQuery: Record<string, FilterId> = {
  "sin-senal": "offline",
  alerta: "alert",
  mantenimiento: "maintenance",
  reiniciando: "rebooting",
  linea: "online",
};

const rank: Record<Status, number> = {
  offline: 0,
  rebooting: 1,
  alert: 2,
  maintenance: 3,
  online: 4,
};

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
    .filter((machine) => (filter === "all" ? true : machine.status === filter))
    .filter((machine) => {
      if (!query) return true;
      const haystack = fold(
        [
          machine.name,
          machine.user,
          machine.ip,
          machine.os,
          ROLE_LABEL[machine.role],
          machine.branch.name,
          machine.branch.city,
          machine.branch.manager,
        ].join(" "),
      );
      return haystack.includes(fold(query));
    })
    .sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        a.branch.city.localeCompare(b.branch.city, "es") ||
        a.name.localeCompare(b.name, "es"),
    );

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Equipos</p>
        <h1 className="mt-1 text-4xl">Todas las computadoras</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cajas, mostrador, oficina, almacén y kiosco. Los que traen problema aparecen primero.
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3">
        <SearchField id="buscar-equipos" value={query} onChange={setQuery} placeholder="Buscar equipo, sucursal, usuario o IP" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setManual({ filter: item.id, estado })}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs",
                filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {machines.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-card px-4 py-8 ring-1 ring-foreground/10">
          <p className="text-sm">
            {query ? <>Ningún equipo coincide con «{query}».</> : "No hay equipos en este estado."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm text-primary"
            onClick={() => {
              setQuery("");
              setManual({ filter: "all", estado });
            }}
          >
            Ver toda la flota
          </button>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {machines.map((machine) => (
            <li key={machine.id}>
              <Link href={`/equipos/${machine.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent/60">
                <div className="min-w-0">
                  <p className="font-medium">
                    {machine.name}
                    <span className="font-normal text-muted-foreground"> · {machine.branch.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[machine.role]} · {machine.branch.city} · {machine.ip} · visto {formatRelative(machine.lastSeen, now)}
                  </p>
                </div>
                <StatusPill status={machine.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
