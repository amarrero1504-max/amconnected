"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { withDesktop } from "@/lib/desk";
import {
  createDeskNote,
  deleteDeskFile,
  enqueueCommand,
  fleetStats,
  freshFleet,
  isFleetState,
  machineViews,
  markOnline,
  noteDesktop,
  recordDiskCleanup,
  saveDeskFile,
  saveHostScreen,
  tick,
  unlockSession,
  withOperator,
} from "@/lib/fleet";
import type { ActionResult, Branch, Command, CommandKind, FleetStats, LogEntry, MachineView } from "@/lib/types";

const STORAGE_KEY = "vigia-state-v1";

type FleetApi = {
  ready: boolean;
  storageError: string | null;
  now: number;
  operator: string;
  branches: Branch[];
  views: MachineView[];
  commands: Command[];
  logs: LogEntry[];
  stats: FleetStats;
  enqueue: (input: { machineId: string; kind: CommandKind; message?: string }) => ActionResult;
  registerSignal: (machineId: string) => ActionResult;
  registerDiskCleanup: (machineId: string) => ActionResult;
  openDesktop: (machineId: string) => ActionResult;
  saveFile: (machineId: string, fileId: string, body: string) => ActionResult;
  deleteFile: (machineId: string, fileId: string) => ActionResult;
  saveScreen: (machineId: string, body: string) => ActionResult;
  createNote: (machineId: string) => ActionResult & { fileId?: string };
  unlock: (machineId: string) => ActionResult;
  setOperator: (name: string) => void;
  reset: () => void;
};

type Store = {
  fleet: ReturnType<typeof freshFleet>;
  notice: string | null;
  now: number;
};

const FleetContext = createContext<FleetApi | null>(null);

const emptyStats: FleetStats = {
  total: 0,
  branches: 0,
  online: 0,
  offline: 0,
  alert: 0,
  maintenance: 0,
  rebooting: 0,
};

export function FleetProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const stateRef = useRef<ReturnType<typeof freshFleet> | null>(null);
  const noticeRef = useRef<string | null>(null);

  const commit = useCallback((next: NonNullable<Store["fleet"]>, notice?: string | null) => {
    if (notice !== undefined) noticeRef.current = notice;
    stateRef.current = next;
    setStore({ fleet: next, notice: noticeRef.current, now: Date.now() });
  }, []);

  useEffect(() => {
    const now = Date.now();
    let restored: ReturnType<typeof freshFleet> | null = null;
    let notice: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isFleetState(parsed)) restored = parsed;
        else notice = "El guardado local no servía. Volví a cargar la flota de ejemplo.";
      }
    } catch {
      notice = "No pude leer el guardado local. Volví a cargar la flota de ejemplo.";
    }

    const base = withDesktop(restored ?? freshFleet(now));
    commit(
      {
        ...base,
        machines: base.machines.map((machine) =>
          machine.link === "up" && !machine.rebooting ? { ...machine, lastSeen: now } : machine,
        ),
      },
      notice,
    );

    const id = window.setInterval(() => {
      const current = stateRef.current;
      if (!current) return;
      commit(tick(current, Date.now()));
    }, 2000);

    return () => window.clearInterval(id);
  }, [commit]);

  useEffect(() => {
    if (!store) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.fleet));
    } catch {
      // The console still works if the browser refuses to store it.
    }
  }, [store]);

  const enqueue = useCallback(
    (input: { machineId: string; kind: CommandKind; message?: string }) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = enqueueCommand(current, { ...input, actor: current.operator }, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: result.queued } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const registerSignal = useCallback(
    (machineId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = markOnline(current, machineId, current.operator, Date.now());
      if (result.ok) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const registerDiskCleanup = useCallback(
    (machineId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = recordDiskCleanup(current, machineId, current.operator, Date.now());
      if (result.ok) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const openDesktop = useCallback(
    (machineId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = noteDesktop(current, machineId, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const saveFile = useCallback(
    (machineId: string, fileId: string, body: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = saveDeskFile(current, machineId, fileId, body, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const deleteFile = useCallback(
    (machineId: string, fileId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = deleteDeskFile(current, machineId, fileId, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const saveScreen = useCallback(
    (machineId: string, body: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = saveHostScreen(current, machineId, body, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const createNote = useCallback(
    (machineId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = createDeskNote(current, machineId, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      if (!result.ok) return { ok: false as const, error: result.error };
      return { ok: true as const, queued: false, fileId: result.fileId };
    },
    [commit],
  );

  const unlock = useCallback(
    (machineId: string) => {
      const current = stateRef.current;
      if (!current) return { ok: false as const, error: "Sigue cargando la flota." };
      const result = unlockSession(current, machineId, current.operator, Date.now());
      if (result.ok && result.state) commit(result.state);
      return result.ok ? { ok: true as const, queued: false } : { ok: false as const, error: result.error };
    },
    [commit],
  );

  const setOperator = useCallback(
    (name: string) => {
      const current = stateRef.current;
      if (!current) return;
      commit(withOperator(current, name));
    },
    [commit],
  );

  const reset = useCallback(() => {
    commit(freshFleet(Date.now()));
  }, [commit]);

  const api = useMemo<FleetApi>(() => {
    if (!store) {
      return {
        ready: false,
        storageError: null,
        now: 0,
        operator: "Mesa central",
        branches: [],
        views: [],
        commands: [],
        logs: [],
        stats: emptyStats,
        enqueue,
        registerSignal,
        registerDiskCleanup,
        openDesktop,
        saveFile,
        deleteFile,
        saveScreen,
        createNote,
        unlock,
        setOperator,
        reset,
      };
    }
    const views = machineViews(store.fleet);
    return {
      ready: true,
      storageError: store.notice,
      now: store.now,
      operator: store.fleet.operator,
      branches: store.fleet.branches,
      views,
      commands: store.fleet.commands,
      logs: store.fleet.logs,
      stats: fleetStats(views),
      enqueue,
      registerSignal,
      registerDiskCleanup,
      openDesktop,
      saveFile,
      deleteFile,
      saveScreen,
      createNote,
      unlock,
      setOperator,
      reset,
    };
  }, [store, enqueue, registerSignal, registerDiskCleanup, openDesktop, saveFile, deleteFile, saveScreen, createNote, unlock, setOperator, reset]);

  return <FleetContext.Provider value={api}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const value = useContext(FleetContext);
  if (!value) throw new Error("useFleet tiene que usarse dentro de FleetProvider");
  return value;
}
