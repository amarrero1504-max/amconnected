"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LayoutDashboard, Menu, Monitor, ScrollText, Store, TabletSmartphone, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/equipos",
    label: "Equipos",
    short: "Equipos",
    icon: Monitor,
    active: (pathname: string) => pathname === "/equipos" || pathname.startsWith("/equipos/"),
  },
  {
    href: "/probar",
    label: "Probar en mi tablet",
    short: "Probar",
    icon: TabletSmartphone,
    active: (pathname: string) => pathname.startsWith("/probar"),
  },
  {
    href: "/archivos",
    label: "Acceso a archivos",
    short: "Archivos",
    icon: FolderOpen,
    active: (pathname: string) => pathname.startsWith("/archivos"),
  },
  {
    href: "/sucursales",
    label: "Sucursales",
    short: "Sucursales",
    icon: Store,
    active: (pathname: string) => pathname.startsWith("/sucursales"),
  },
  {
    href: "/bitacora",
    label: "Registros",
    short: "Registros",
    icon: ScrollText,
    active: (pathname: string) => pathname.startsWith("/bitacora"),
  },
  {
    href: "/resumen",
    label: "Resumen",
    short: "Resumen",
    icon: LayoutDashboard,
    active: (pathname: string) => pathname.startsWith("/resumen"),
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const fleet = useFleet();
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-dvh bg-[#f3f5f8]">
      <header className="flex h-12 items-center gap-3 bg-[#1578c9] px-3 text-white">
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md hover:bg-white/10 md:hidden"
          aria-label={menu ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenu((open) => !open)}
        >
          {menu ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link href="/equipos" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-white/15">
            <Monitor className="size-4" aria-hidden />
          </span>
          Vigía
        </Link>
        <p className="hidden text-sm text-white/80 sm:block">Abarrotes Del Valle</p>
        <div className="ml-auto">
          <OperatorAvatar />
        </div>
      </header>

      <div className="md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-[calc(100dvh-3rem)] flex-col border-r border-sidebar-border bg-sidebar py-3 md:flex">
          <Suspense fallback={<SideNav pathname={null} onNavigate={() => undefined} />}>
            <PathSideNav />
          </Suspense>
          <p className="mt-auto px-4 pt-4 text-[11px] leading-4 text-muted-foreground">
            En esta demo el escritorio y los agentes de las sucursales están simulados.
          </p>
        </aside>

        <div className="min-w-0 bg-white">
          {fleet.storageError ? (
            <p className="bg-alert/15 px-4 py-2 text-sm text-foreground">{fleet.storageError}</p>
          ) : null}
          <Suspense fallback={<main className="px-4 py-5 pb-24 md:px-8 md:py-6 md:pb-8">{children}</main>}>
            <ShellMain>{children}</ShellMain>
          </Suspense>
        </div>
      </div>

      {menu ? (
        <div className="fixed inset-0 top-12 z-40 bg-black/30 md:hidden" onClick={() => setMenu(false)}>
          <aside className="h-full w-64 bg-sidebar py-3 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <Suspense fallback={<SideNav pathname={null} onNavigate={() => setMenu(false)} />}>
              <PathSideNav onNavigate={() => setMenu(false)} />
            </Suspense>
          </aside>
        </div>
      ) : null}

      <Suspense fallback={<BottomNav pathname={null} />}>
        <PathBottomNav />
      </Suspense>
    </div>
  );
}

function ShellMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const flush = pathname === "/equipos" || pathname.startsWith("/archivos");
  return (
    <main className={cn("min-w-0", flush ? "pb-16 md:pb-0" : "px-4 py-5 pb-24 md:px-8 md:py-6 md:pb-8")}>
      {children}
    </main>
  );
}

function PathSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <SideNav pathname={pathname} onNavigate={onNavigate ?? (() => undefined)} />;
}

function SideNav({ pathname, onNavigate }: { pathname: string | null; onNavigate: () => void }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname ? item.active(pathname) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
              active ? "bg-[#e7eef6] font-medium text-[#1578c9]" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PathBottomNav() {
  const pathname = usePathname();
  return <BottomNav pathname={pathname} />;
}

function BottomNav({ pathname }: { pathname: string | null }) {
  const mobile = items.filter((item) => item.href !== "/resumen");
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-white md:hidden"
    >
      {mobile.map((item) => {
        const Icon = item.icon;
        const active = pathname ? item.active(pathname) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 px-1 py-2 text-[11px]",
              active ? "text-[#1578c9]" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}

function OperatorAvatar() {
  const { operator, setOperator, ready } = useFleet();
  const [open, setOpen] = useState(false);
  const letter = operator.trim().slice(0, 1).toUpperCase() || "M";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        disabled={!ready}
        aria-label={`Quién opera: ${operator}`}
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-full bg-white/20 text-sm font-semibold hover:bg-white/30"
      >
        {letter}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quién opera</DialogTitle>
          <DialogDescription>Ese nombre queda en los registros de cada conexión y cada archivo.</DialogDescription>
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
