"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Eye,
  FileText,
  Info,
  Keyboard,
  MessageSquare,
  Monitor,
  PenLine,
  Search,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useFleet } from "@/components/fleet-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deskBlock, screenOf } from "@/lib/desk";
import { fold } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { DeskFile, MachineView } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tool = "info" | "chat" | "files" | "search" | "actions" | "view" | "help" | "pen";

export function SessionBar({
  machine,
  rootRef,
  onOpenFile,
  onNewNote,
  onShowScreen,
  drawing,
  onToggleDraw,
  onClearDraw,
}: {
  machine: MachineView;
  rootRef: RefObject<HTMLDivElement | null>;
  onOpenFile?: (file: DeskFile) => void;
  onNewNote?: () => void;
  onShowScreen?: () => void;
  drawing?: boolean;
  onToggleDraw?: () => void;
  onClearDraw?: () => void;
}) {
  const fleet = useFleet();
  const barRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tool, setTool] = useState<Tool | null>(null);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const label = `${machine.name} ${machine.branch.name}`;
  const others = [...fleet.views]
    .filter((item) => item.id !== machine.id)
    .sort((a, b) => `${a.name} ${a.branch.name}`.localeCompare(`${b.name} ${b.branch.name}`, "es"));

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setMenu(false);
        setTool(null);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(next: Tool) {
    setMenu(false);
    setConfirmRestart(false);
    setTool((current) => (current === next ? null : next));
  }

  function send(kind: "lock" | "inventory" | "restart" | "message", message?: string) {
    const result = fleet.enqueue({ machineId: machine.id, kind, message });
    if (!result.ok) toast.error(result.error);
    else toast.success(result.queued ? "Quedó en cola." : "Listo.");
    if (result.ok) setTool(null);
  }

  function capture() {
    const created = fleet.createNote(machine.id);
    if (!created.ok || !created.fileId) {
      toast.error(created.ok ? "No pude guardar la pantalla." : created.error);
      return;
    }
    const scene = screenOf(machine, machine.branch.name);
    const saved = fleet.saveFile(
      machine.id,
      created.fileId,
      `Pantalla de ${machine.user}\n${label}\n\n${scene.title}\n${scene.body}`,
    );
    if (!saved.ok) toast.error(saved.error);
    else toast.success("La pantalla quedó en una nota del equipo.");
  }

  if (collapsed) {
    return (
      <div className="mb-3 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-b-xl bg-[#1578c9] px-4 py-1.5 text-sm text-white shadow-md"
          onClick={() => setCollapsed(false)}
        >
          {label}
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  const found = machine.files.filter((file) => fold(file.name).includes(fold(query.trim())));

  return (
    <div ref={barRef} className="relative z-30 mb-3">
      <div
        role="toolbar"
        aria-label={`Sesión de ${machine.user}`}
        className="flex h-12 items-center gap-1 rounded-xl bg-[#1578c9] px-2 text-white shadow-md"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#1578c9]">
          <Monitor className="size-4" aria-hidden />
        </span>
        <button
          type="button"
          className="flex max-w-[11rem] items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-white/10 sm:max-w-56"
          aria-expanded={menu}
          onClick={() => {
            setTool(null);
            setMenu((open) => !open);
          }}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <ToolButton label="Desconectar" onClick={() => undefined} href="/equipos">
            <span className="relative">
              <Monitor className="size-[18px]" />
              <X className="absolute -right-1.5 -bottom-1 size-3 text-red-300" />
            </span>
          </ToolButton>
          <ToolButton label="Información" pressed={tool === "info"} onClick={() => pick("info")}>
            <Info className="size-[18px]" />
          </ToolButton>
          <ToolButton
            label={muted ? "Activar sonido" : "Silenciar"}
            pressed={muted}
            onClick={() => {
              setMuted((value) => !value);
              toast.success(muted ? "Sonido de la sesión activo." : "Sonido de la sesión en silencio.");
            }}
          >
            {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
          </ToolButton>
          <ToolButton
            label="Pantalla completa"
            onClick={() => {
              const node = rootRef.current;
              if (!node) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void node.requestFullscreen();
            }}
          >
            <ArrowUpRight className="size-[18px]" />
          </ToolButton>
          <ToolButton
            label="Ver pantalla"
            onClick={() => {
              onShowScreen?.();
              setTool(null);
              setMenu(false);
            }}
          >
            <Video className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Aviso" pressed={tool === "chat"} onClick={() => pick("chat")}>
            <MessageSquare className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Marcar" pressed={tool === "pen" || drawing} onClick={() => pick("pen")}>
            <PenLine className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Buscar archivo" pressed={tool === "search"} onClick={() => pick("search")}>
            <Search className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Guardar pantalla" onClick={capture}>
            <Camera className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Archivos" pressed={tool === "files"} onClick={() => pick("files")}>
            <FileText className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Acciones" pressed={tool === "actions"} onClick={() => pick("actions")}>
            <Keyboard className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Vista" pressed={tool === "view"} onClick={() => pick("view")}>
            <Eye className="size-[18px]" />
          </ToolButton>
          <ToolButton label="Ayuda" pressed={tool === "help"} onClick={() => pick("help")}>
            <CircleHelp className="size-[18px]" />
          </ToolButton>
        </div>

        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-white/10"
          aria-label="Replegar la barra"
          onClick={() => {
            setCollapsed(true);
            setTool(null);
            setMenu(false);
          }}
        >
          <ChevronUp className="size-5" />
        </button>
      </div>

      {menu ? (
        <div className="absolute top-14 left-2 z-40 w-72 overflow-hidden rounded-lg bg-white text-slate-800 shadow-xl ring-1 ring-black/10">
          <p className="border-b border-border px-3 py-2 text-xs text-slate-500">
            Conectado con <span className="font-medium text-slate-800">{machine.user}</span>
          </p>
          <ul className="max-h-64 overflow-auto py-1">
            {others.map((item) => {
              const reachable = deskBlock(item) === null;
              const name = `${item.name} ${item.branch.name}`;
              return (
                <li key={item.id}>
                  {reachable ? (
                    <Link
                      href={`/equipos/${item.id}/escritorio`}
                      className="block px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => fleet.openDesktop(item.id)}
                    >
                      {name}
                      <span className="mt-0.5 block text-xs text-slate-500">{item.user}</span>
                    </Link>
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-400">
                      {name}
                      <span className="mt-0.5 block text-xs">Desconectado</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tool ? (
        <div className="absolute top-14 right-2 left-12 z-40 max-w-lg rounded-lg bg-white p-3 text-sm text-slate-800 shadow-xl ring-1 ring-black/10 sm:left-40">
          {tool === "info" ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Fact label="Usuario" value={machine.user} />
              <Fact label="Equipo" value={label} />
              <Fact label="Puesto" value={ROLE_LABEL[machine.role]} />
              <Fact label="Sucursal" value={`${machine.branch.name}, ${machine.branch.city}`} />
              <Fact label="Sistema" value={machine.os} />
              <Fact label="Dirección" value={machine.ip} />
              <Fact label="Disco" value={`${Math.round(machine.disk)}%`} />
              <Fact label="Procesador" value={`${Math.round(machine.cpu)}%`} />
            </dl>
          ) : null}
          {tool === "chat" ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                send("message", notice);
              }}
            >
              <p className="text-xs text-slate-500">El texto aparece en la pantalla de {machine.user}.</p>
              <Textarea
                value={notice}
                maxLength={180}
                aria-label="Aviso en pantalla"
                placeholder="Cierra esta caja a las 9."
                onChange={(event) => setNotice(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={!notice.trim()}>
                Mostrar aviso
              </Button>
            </form>
          ) : null}
          {tool === "files" ? (
            <div>
              <ul className="max-h-48 overflow-auto">
                {machine.files.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50"
                      onClick={() => {
                        if (onOpenFile) {
                          onOpenFile(file);
                          setTool(null);
                        } else toast.error("Desbloquea la sesión para abrir el archivo.");
                      }}
                    >
                      {file.name}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!onNewNote) {
                    toast.error("Desbloquea la sesión para crear la nota.");
                    return;
                  }
                  onNewNote();
                  setTool(null);
                }}
              >
                Nueva nota
              </Button>
            </div>
          ) : null}
          {tool === "search" ? (
            <div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre del archivo"
                aria-label="Buscar archivo"
                className="h-8 w-full rounded-md border border-border px-2"
              />
              <ul className="mt-2 max-h-40 overflow-auto">
                {found.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50"
                      onClick={() => {
                        if (onOpenFile) {
                          onOpenFile(file);
                          setTool(null);
                        } else toast.error("Desbloquea la sesión para abrir el archivo.");
                      }}
                    >
                      {file.name}
                    </button>
                  </li>
                ))}
                {found.length === 0 ? <li className="px-2 py-1.5 text-slate-500">Ningún archivo con ese nombre.</li> : null}
              </ul>
            </div>
          ) : null}
          {tool === "pen" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={drawing ? "default" : "outline"} onClick={() => onToggleDraw?.()}>
                {drawing ? "Dejar de marcar" : "Marcar la pantalla"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onClearDraw?.()}>
                Borrar marcas
              </Button>
            </div>
          ) : null}
          {tool === "actions" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => send("lock")}>
                Bloquear sesión
              </Button>
              <Button size="sm" variant="outline" onClick={() => send("inventory")}>
                Pedir inventario
              </Button>
              {confirmRestart ? (
                <Button size="sm" onClick={() => send("restart")}>
                  Confirmar reinicio
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmRestart(true)}>
                  Reiniciar
                </Button>
              )}
            </div>
          ) : null}
          {tool === "view" ? (
            <div className="space-y-2">
              <p>
                Estás viendo la sesión de <span className="font-medium">{machine.user}</span> en {label}.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onShowScreen?.();
                  setTool(null);
                }}
              >
                Traer la pantalla al frente
              </Button>
            </div>
          ) : null}
          {tool === "help" ? (
            <p className="leading-6 text-slate-600">
              El mouse y el teclado controlan la sesión de este equipo: escribes, cambias y borras lo que está en
              pantalla. Desconectar cierra el control. Supr elimina el archivo que esté seleccionado. La flecha de la
              derecha repliega esta barra.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  onClick,
  href,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className = cn(
    "grid size-8 shrink-0 place-items-center rounded-md hover:bg-white/15",
    pressed && "bg-white/20",
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
