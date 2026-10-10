"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { FileText, Monitor, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useFleet } from "@/components/fleet-provider";
import { SessionBar } from "@/components/session-bar";
import { Button } from "@/components/ui/button";
import { DESK_BODY_LIMIT, deskBlock, screenOf } from "@/lib/desk";
import { formatClock } from "@/lib/format";
import type { DeskFile, MachineView } from "@/lib/types";

const SCREEN = "pantalla";

type Win = { id: string; x: number; y: number; z: number };
type Point = { x: number; y: number };

export function MachineDesktop({ machine }: { machine: MachineView }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const block = deskBlock(machine);
  return (
    <div ref={rootRef} className="bg-white">
      {block ? (
        <>
          <SessionBar machine={machine} rootRef={rootRef} />
          <DarkScreen machine={machine} title="Sin imagen" body={block} />
        </>
      ) : machine.locked ? (
        <>
          <SessionBar machine={machine} rootRef={rootRef} />
          <LockScreen machine={machine} />
        </>
      ) : (
        <LiveDesktop machine={machine} rootRef={rootRef} />
      )}
    </div>
  );
}

function LiveDesktop({
  machine,
  rootRef,
}: {
  machine: MachineView;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const fleet = useFleet();
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const stroke = useRef<Point[] | null>(null);
  const [windows, setWindows] = useState<Win[]>([{ id: SCREEN, x: 16, y: 12, z: 1 }]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [drawing, setDrawing] = useState(false);
  const [marks, setMarks] = useState<Point[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [screenDraft, setScreenDraft] = useState<string | null>(null);
  const scene = screenOf(machine, machine.branch.name);
  const clock = formatClock(new Date(fleet.now));
  const screenValue = screenDraft ?? machine.screenText ?? scene.body;
  const screenDirty = screenValue !== (machine.screenText ?? scene.body);

  function raise(id: string) {
    setWindows((current) => {
      const top = current.reduce((max, win) => Math.max(max, win.z), 0) + 1;
      if (current.some((win) => win.id === id)) {
        return current.map((win) => (win.id === id ? { ...win, z: top } : win));
      }
      const wide = window.matchMedia("(min-width: 960px)").matches;
      const step = current.length;
      const spot = wide ? { x: 280 + step * 24, y: 18 + step * 16 } : { x: 8, y: 8 + step * 14 };
      return [...current, { id, ...spot, z: top }];
    });
  }

  function openFile(file: DeskFile) {
    setSelected(file.id);
    setDrafts((current) => (current[file.id] !== undefined ? current : { ...current, [file.id]: file.body }));
    raise(file.id);
  }

  function removeFile(fileId: string) {
    const file = machine.files.find((item) => item.id === fileId);
    if (!file) return;
    const result = fleet.deleteFile(machine.id, fileId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setWindows((items) => items.filter((item) => item.id !== fileId));
    setDrafts((current) => {
      const next = { ...current };
      delete next[fileId];
      return next;
    });
    setSelected((current) => (current === fileId ? null : current));
    toast.success(`«${file.name}» se eliminó del equipo.`);
  }

  function saveScreen() {
    const result = fleet.saveScreen(machine.id, screenValue);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setScreenDraft(null);
    toast.success("La pantalla quedó guardada en el equipo.");
  }

  function onHostKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input")) return;
    if (event.key === "Delete" && selected && selected !== SCREEN) {
      event.preventDefault();
      removeFile(selected);
      return;
    }
    if (event.key === "Enter" && selected) {
      const file = machine.files.find((item) => item.id === selected);
      if (file) openFile(file);
    }
  }

  function addNote() {
    const result = fleet.createNote(machine.id);
    if (!result.ok || !result.fileId) {
      toast.error(result.ok ? "No pude crear la nota." : result.error);
      return;
    }
    const fileId = result.fileId;
    setDrafts((current) => ({ ...current, [fileId]: "" }));
    raise(fileId);
    toast.success("Nota nueva en el escritorio.");
  }

  function save(file: DeskFile) {
    const body = drafts[file.id] ?? file.body;
    const result = fleet.saveFile(machine.id, file.id, body);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDrafts((current) => ({ ...current, [file.id]: body }));
    toast.success(`«${file.name}» quedó en ${machine.name}.`);
  }

  function onTitlePointerDown(event: PointerEvent<HTMLElement>, id: string) {
    if (event.button !== 0) return;
    const stage = stageRef.current;
    const win = windows.find((item) => item.id === id);
    if (!stage || !win) return;
    const rect = stage.getBoundingClientRect();
    drag.current = { id, ox: event.clientX - rect.left - win.x, oy: event.clientY - rect.top - win.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    raise(id);
  }

  function onTitlePointerMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    const stage = stageRef.current;
    if (!current || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left - current.ox, 0, Math.max(0, rect.width - 96));
    const y = clamp(event.clientY - rect.top - current.oy, 0, Math.max(0, rect.height - 72));
    setWindows((items) => items.map((win) => (win.id === current.id ? { ...win, x, y } : win)));
  }

  function onTitlePointerUp() {
    drag.current = null;
  }

  function pointOf(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <>
    <SessionBar
      machine={machine}
      rootRef={rootRef}
      drawing={drawing}
      onOpenFile={openFile}
      onNewNote={addNote}
      onShowScreen={() => raise(SCREEN)}
      onToggleDraw={() => setDrawing((value) => !value)}
      onClearDraw={() => setMarks([])}
    />
    <Frame
      caption={
        <span className="inline-flex items-center gap-2">
          <span className="dot-live size-2 rounded-full bg-online" />
          Mouse y teclado en {machine.user}
        </span>
      }
    >
      <div
        tabIndex={0}
        onKeyDown={onHostKeyDown}
        className="flex h-[36rem] flex-col outline-none sm:h-[40rem]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 8% 0%, oklch(0.46 0.07 155 / 0.85), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.38 0.05 80 / 0.45), transparent 55%), oklch(0.28 0.04 155)",
        }}
      >
        {machine.screenNotice ? (
          <p className="bg-alert px-4 py-2 text-sm text-white">
            Aviso en pantalla: «{machine.screenNotice.text}»
          </p>
        ) : null}
        {machine.maintenance ? (
          <p className="bg-maintenance/90 px-4 py-2 text-sm text-white">
            El local está en mantenimiento. La pantalla se ve y puedes editar los archivos.
          </p>
        ) : null}
        <div className="flex gap-1 overflow-x-auto px-3 py-3">
          <DockButton
            icon={<Monitor className="size-5" />}
            label="Pantalla"
            selected={selected === SCREEN}
            onClick={() => {
              setSelected(SCREEN);
              raise(SCREEN);
            }}
          />
          {machine.files.map((file) => (
            <DockButton
              key={file.id}
              icon={<FileText className="size-5" />}
              label={file.name}
              selected={selected === file.id}
              onClick={() => {
                setSelected(file.id);
                openFile(file);
              }}
            />
          ))}
          <DockButton icon={<Plus className="size-5" />} label="Nueva nota" onClick={addNote} />
        </div>
        <div ref={stageRef} className="relative min-h-0 flex-1">
          {windows.length === 0 ? (
            <p className="px-4 text-sm text-white/80">Elige un archivo o abre la pantalla de {machine.user}.</p>
          ) : null}
          {windows.map((win) => {
            const file = machine.files.find((item) => item.id === win.id);
            const title = win.id === SCREEN ? scene.title : (file?.name ?? "Archivo");
            const draft = file ? (drafts[file.id] ?? file.body) : "";
            const dirty = file ? draft !== file.body : false;
            return (
              <section
                key={win.id}
                aria-label={title}
                className="absolute flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground shadow-xl ring-1 ring-black/10"
                style={{
                  left: win.x,
                  top: win.y,
                  zIndex: win.z,
                  width: "min(28rem, calc(100% - 1rem))",
                  height: "min(22rem, calc(100% - 3.25rem))",
                }}
                onPointerDown={() => raise(win.id)}
              >
                <div
                  className="flex cursor-grab items-center gap-2 bg-secondary px-2 py-1.5 select-none"
                  onPointerDown={(event) => onTitlePointerDown(event, win.id)}
                  onPointerMove={onTitlePointerMove}
                  onPointerUp={onTitlePointerUp}
                >
                  <h2 className="min-w-0 flex-1 truncate text-sm font-medium tracking-normal">{title}</h2>
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-md hover:bg-background"
                    aria-label={`Cerrar ${title}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setWindows((items) => items.filter((item) => item.id !== win.id))}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {win.id === SCREEN ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <p className="px-3 pt-2 text-xs text-muted-foreground">{scene.detail}</p>
                    <textarea
                      className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm leading-6 outline-none"
                      aria-label={`Pantalla de ${machine.user}`}
                      value={screenValue}
                      maxLength={DESK_BODY_LIMIT}
                      onChange={(event) => setScreenDraft(event.target.value)}
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{screenDirty ? "Sin guardar" : "En el equipo"}</p>
                      <Button size="sm" disabled={!screenDirty} onClick={saveScreen}>
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : file ? (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <label className="min-h-0 flex-1">
                      <span className="sr-only">Contenido de {file.name}</span>
                      <textarea
                        className="h-full w-full resize-none bg-transparent p-3 font-mono text-sm leading-6 outline-none"
                        value={draft}
                        maxLength={DESK_BODY_LIMIT}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [file.id]: event.target.value }))
                        }
                      />
                    </label>
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        {dirty ? "Sin guardar" : "Guardado"} · {draft.length}/{DESK_BODY_LIMIT}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => removeFile(file.id)}>
                          Eliminar
                        </Button>
                        <Button size="sm" disabled={!dirty} onClick={() => save(file)}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
          {drawing ? (
            <svg
              className="absolute inset-0 z-30 touch-none"
              aria-label="Marcas sobre la pantalla"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const next = [pointOf(event)];
                stroke.current = next;
                setMarks((current) => [...current, next]);
              }}
              onPointerMove={(event) => {
                if (!stroke.current) return;
                const next = [...stroke.current, pointOf(event)];
                stroke.current = next;
                setMarks((current) => current.map((item, index) => (index === current.length - 1 ? next : item)));
              }}
              onPointerUp={() => {
                stroke.current = null;
              }}
            >
              {marks.map((mark, index) => (
                <polyline
                  key={index}
                  points={mark.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="#f5d76e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 z-40 flex items-center gap-2 bg-black/40 px-3 py-2 text-xs text-white backdrop-blur-sm">
            <span className="rounded-md bg-white/15 px-2 py-1">Del Valle</span>
            <span className="min-w-0 flex-1 truncate">{machine.user}</span>
            <span className="tabular-nums">{clock}</span>
          </div>
        </div>
      </div>
    </Frame>
    </>
  );
}

function LockScreen({ machine }: { machine: MachineView }) {
  const { unlock } = useFleet();

  return (
    <Frame caption={`${machine.name} · sesión bloqueada`}>
      <div className="flex h-80 flex-col items-center justify-center gap-4 bg-[oklch(0.24_0.03_155)] px-6 text-center text-white sm:h-96">
        <span className="grid size-16 place-items-center rounded-full bg-white/10 text-2xl">
          {machine.user.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="text-2xl">{machine.user}</p>
          <p className="mt-1 text-sm text-white/75">Sesión bloqueada en {machine.branch.name}</p>
        </div>
        <Button
          onClick={() => {
            const result = unlock(machine.id);
            if (!result.ok) toast.error(result.error);
            else toast.success("Sesión abierta.");
          }}
        >
          Desbloquear
        </Button>
      </div>
    </Frame>
  );
}

function DarkScreen({ machine, title, body }: { machine: MachineView; title: string; body: string }) {
  return (
    <Frame caption={`${machine.name} · sin imagen`}>
      <div className="flex h-72 flex-col items-start justify-center gap-3 px-6 text-white sm:h-80">
        <h2 className="text-3xl text-white">{title}</h2>
        <p className="max-w-md text-sm text-white/80">{body}</p>
        <Link href={`/equipos/${machine.id}`} className="text-sm text-white underline-offset-4 hover:underline">
          Volver a la ficha
        </Link>
      </div>
    </Frame>
  );
}

function Frame({ caption, children }: { caption: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[oklch(0.22_0.02_155)] shadow-lg ring-1 ring-foreground/15">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-white/70">{caption}</div>
      {children}
    </div>
  );
}

function DockButton({
  icon,
  label,
  onClick,
  selected,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] leading-tight text-white hover:bg-white/10 ${selected ? "bg-white/15 ring-1 ring-white/40" : ""}`}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20">{icon}</span>
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
