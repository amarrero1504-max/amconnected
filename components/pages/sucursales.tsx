"use client";

import { useState } from "react";
import { BranchCard } from "@/components/branch-card";
import { FleetSkeleton } from "@/components/fleet-skeleton";
import { useFleet } from "@/components/fleet-provider";
import { SearchField } from "@/components/search-field";
import { fold } from "@/lib/format";
import { sortBranches } from "@/lib/fleet";
import { REGION_ORDER } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function Sucursales() {
  const fleet = useFleet();
  const [query, setQuery] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);
  if (!fleet.ready) return <FleetSkeleton />;

  const branches = sortBranches(fleet.branches).filter((branch) => {
    const machines = fleet.views.filter((machine) => machine.branchId === branch.id);
    const haystack = fold([branch.name, branch.city, branch.region, branch.address, branch.manager].join(" "));
    if (query && !haystack.includes(fold(query))) return false;
    if (!onlyProblems) return true;
    return machines.some((machine) => machine.status !== "online");
  });

  const groups = new Map<string, typeof branches>();
  for (const region of REGION_ORDER) groups.set(region, []);
  for (const branch of branches) {
    const list = groups.get(branch.region) ?? [];
    list.push(branch);
    groups.set(branch.region, list);
  }

  const visibleGroups = [...groups.entries()].filter(([, list]) => list.length > 0);

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Sucursales</p>
        <h1 className="mt-1 text-4xl">Dónde están los equipos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocho locales de Abarrotes Del Valle. Entra a uno para ver sus cajas, el mostrador y la oficina.
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField id="buscar-sucursales" value={query} onChange={setQuery} placeholder="Buscar sucursal, ciudad o encargado" />
        <button
          type="button"
          aria-pressed={onlyProblems}
          onClick={() => setOnlyProblems((value) => !value)}
          className={cn(
            "h-9 rounded-full border px-3 text-xs",
            onlyProblems ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
          )}
        >
          Solo con pendientes
        </button>
      </div>

      {visibleGroups.length === 0 ? (
        <Empty query={query} onClear={() => { setQuery(""); setOnlyProblems(false); }} />
      ) : (
        <div className="mt-8 space-y-8">
          {visibleGroups.map(([region, list]) => (
            <section key={region}>
              <h2 className="text-xl">{region}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {list.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    machines={fleet.views.filter((machine) => machine.branchId === branch.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mt-8 rounded-2xl bg-card px-4 py-8 ring-1 ring-foreground/10">
      <p className="text-sm">
        {query ? <>Ninguna sucursal coincide con «{query}».</> : "Ninguna sucursal tiene pendientes con este filtro."}
      </p>
      <button type="button" onClick={onClear} className="mt-3 text-sm text-primary">
        Limpiar filtro
      </button>
    </div>
  );
}
