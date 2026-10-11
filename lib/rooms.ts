import os from "os";

export type Role = "host" | "viewer";

export type Signal = {
  id: number;
  to: Role;
  type: "offer" | "answer" | "ice" | "input" | "hangup";
  payload: unknown;
};

type Room = {
  createdAt: number;
  seq: number;
  viewer: boolean;
  signals: Signal[];
};

const TTL_MS = 30 * 60 * 1000;

function rooms() {
  const globalStore = globalThis as typeof globalThis & { __vigiaRooms?: Map<string, Room> };
  if (!globalStore.__vigiaRooms) globalStore.__vigiaRooms = new Map();
  return globalStore.__vigiaRooms;
}

function sweep(now: number) {
  for (const [code, room] of rooms()) {
    if (now - room.createdAt > TTL_MS) rooms().delete(code);
  }
}

export function lanHosts(port: string) {
  const hosts: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) hosts.push(`${entry.address}:${port}`);
    }
  }
  return hosts;
}

export function createRoom(now: number) {
  sweep(now);
  let code = "";
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms().has(code));
  rooms().set(code, { createdAt: now, seq: 1, viewer: false, signals: [] });
  return code;
}

export function joinRoom(code: string, now: number) {
  sweep(now);
  const room = rooms().get(code);
  if (!room) return { ok: false as const, error: "Ese código no está. Créalo en la PC." };
  if (room.viewer) return { ok: false as const, error: "Ya hay una tablet en esta prueba." };
  room.viewer = true;
  return { ok: true as const };
}

export function pushSignal(code: string, to: Role, type: Signal["type"], payload: unknown, now: number) {
  sweep(now);
  const room = rooms().get(code);
  if (!room) return { ok: false as const, error: "La prueba ya se cerró." };
  const signal: Signal = { id: room.seq, to, type, payload };
  room.seq += 1;
  room.signals.push(signal);
  if (room.signals.length > 80) room.signals.splice(0, room.signals.length - 80);
  return { ok: true as const };
}

export function pullSignals(code: string, role: Role, after: number, now: number) {
  sweep(now);
  const room = rooms().get(code);
  if (!room) return { ok: false as const, error: "La prueba ya se cerró.", signals: [] as Signal[] };
  const signals = room.signals.filter((signal) => signal.to === role && signal.id > after);
  const delivered = new Set(signals.map((signal) => signal.id));
  room.signals = room.signals.filter((signal) => !delivered.has(signal.id));
  return { ok: true as const, signals };
}

export function closeRoom(code: string) {
  rooms().delete(code);
}
