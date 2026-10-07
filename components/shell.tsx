"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Monitor, ScrollText, Store } from "lucide-react";
import { useFleet } from "@/components/fleet-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatClock, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/sucursales", label: "Sucursales", icon: Store },
  { href: "/equipos", label: "Equipos", icon: Monitor },
  { href: "/bitacora", label: "Bitácora", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: ReactNode }) {
  const fleet = useFleet();
  const clock = useMexicoClock();
  const pending = fleet.commands.filter(
    (command) => command.status === "queued" || command.status === "running",
  ).length;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 md:flex">
        <Brand />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Abarrotes Del Valle
          <br />
          Mesa de control
        </p>
        <Suspense fallback={<SectionNav variant="side" pathname={null} />}>
          <PathSectionNav variant="side" />
        </Suspense>
        {pending > 0 ? (
          <p className="mt-4 px-2.5 text-xs text-muted-foreground">
            {pending === 1 ? "1 orden en camino" : `${pending} órdenes en camino`}
          </p>
        ) : null}
        <div className="mt-auto space-y-4">
          <OperatorField />
          <div>
            <p className="text-xs text-muted-foreground">{clock ? formatLongDate(clock) : "Hora del centro"}</p>
            <p className="text-3xl tabular-nums">{clock ? formatClock(clock) : "—"}</p>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground">
            En esta demo los agentes de las sucursales están simulados.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <p className="text-sm tabular-nums">{clock ? formatClock(clock) : ""}</p>
            <MobileOperator />
          </div>
        </div>
        {fleet.storageError ? (
          <p className="bg-alert/15 px-4 py-2 text-sm text-foreground">{fleet.storageError}</p>
        ) : null}
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>

      <Suspense fallback={<SectionNav variant="bottom" pathname={null} />}>
        <PathSectionNav variant="bottom" />
      </Suspense>
    </div>
  );
}

function PathSectionNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  return <SectionNav variant={variant} pathname={pathname} />;
}

function SectionNav({ variant, pathname }: { variant: "side" | "bottom"; pathname: string | null }) {
  return (
    <nav
      aria-label="Secciones"
      className={
        variant === "side"
          ? "mt-8 flex flex-col gap-1"
          : "fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden"
      }
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname ? isActive(pathname, item.href) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              variant === "side"
                ? "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                : "flex flex-col items-center gap-1 px-1 py-2 text-[11px]",
              active
                ? variant === "side"
                  ? "bg-primary text-primary-foreground"
                  : "text-primary"
                : variant === "side"
                  ? "hover:bg-sidebar-accent"
                  : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-lg text-primary-foreground">V</span>
      <span className="text-2xl italic">Vigía</span>
    </Link>
  );
}

function OperatorField() {
  const { operator, setOperator, ready } = useFleet();
  return <OperatorInput key={operator} operator={operator} ready={ready} onCommit={setOperator} />;
}

function OperatorInput({
  operator,
  ready,
  onCommit,
}: {
  operator: string;
  ready: boolean;
  onCommit: (name: string) => void;
}) {
  const [value, setValue] = useState(operator);
  return (
    <label className="block text-xs text-muted-foreground">
      Quién opera
      <Input
        className="mt-1 bg-card"
        value={value}
        disabled={!ready}
        maxLength={40}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onCommit(value)}
      />
    </label>
  );
}

function MobileOperator() {
  const { operator, setOperator, ready } = useFleet();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" disabled={!ready} onClick={() => setOpen(true)}>
        {operator.split(" ")[0]}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quién opera</DialogTitle>
          <DialogDescription>Ese nombre queda en la bitácora de cada orden.</DialogDescription>
        </DialogHeader>
        {open ? (
          <OperatorDialog
            key={operator}
            operator={operator}
            onSave={(name) => {
              setOperator(name);
              setOpen(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OperatorDialog({ operator, onSave }: { operator: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(operator);
  return (
    <>
      <Input
        value={value}
        maxLength={40}
        aria-label="Nombre de quien opera"
        onChange={(event) => setValue(event.target.value)}
      />
      <DialogFooter>
        <Button onClick={() => onSave(value)}>Guardar</Button>
      </DialogFooter>
    </>
  );
}

function useMexicoClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
