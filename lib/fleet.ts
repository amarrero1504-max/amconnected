import { DESK_BODY_LIMIT, DESK_FILE_LIMIT, deskBlock, nextNoteName, withDesktop } from "@/lib/desk";
import { orderPhrase } from "@/lib/labels";
import { createSeed } from "@/lib/seed";
import type {
  ActionResult,
  Branch,
  Command,
  CommandKind,
  FleetState,
  FleetStats,
  LogEntry,
  Machine,
  MachineView,
  Status,
} from "@/lib/types";

const QUEUED_MS = 1800;
const RUNNING_MS = 2600;

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function statusOf(machine: Machine): Status {
  if (machine.rebooting) return "rebooting";
  if (machine.maintenance) return "maintenance";
  if (machine.link === "down") return "offline";
  if (machine.disk >= 88 || machine.cpu >= 90) return "alert";
  return "online";
}

export function issueFor(machine: Machine) {
  if (machine.rebooting) return "Se está reiniciando. En unos segundos vuelve a reportar.";
  if (machine.maintenance) return null;
  if (machine.link === "down") {
    if (machine.flaky) {
      return "Se cortó la señal. Un reinicio o un inventario se quedan en cola y salen cuando vuelva.";
    }
    return "No reporta desde ayer. Registra la señal cuando alguien en la sucursal confirme que ya tiene internet.";
  }
  if (machine.disk >= 88) {
    return `Disco al ${Math.round(machine.disk)}%. Conviene liberar espacio antes de que la caja se trabe.`;
  }
  if (machine.cpu >= 90) {
    return `Procesador al ${Math.round(machine.cpu)}%. El equipo va lento si se queda así.`;
  }
  return null;
}

export function machineViews(state: FleetState): MachineView[] {
  const branches = new Map(state.branches.map((branch) => [branch.id, branch]));
  return state.machines.flatMap((machine) => {
    const branch = branches.get(machine.branchId);
    if (!branch) return [];
    return [{ ...machine, branch, status: statusOf(machine), issue: issueFor(machine) }];
  });
}

export function fleetStats(views: MachineView[]): FleetStats {
  return {
    total: views.length,
    branches: new Set(views.map((view) => view.branchId)).size,
    online: views.filter((view) => view.status === "online").length,
    offline: views.filter((view) => view.status === "offline").length,
    alert: views.filter((view) => view.status === "alert").length,
    maintenance: views.filter((view) => view.status === "maintenance").length,
    rebooting: views.filter((view) => view.status === "rebooting").length,
  };
}

export function sortBranches(branches: Branch[]) {
  const rank = ["Jalisco", "Ciudad de México", "Nuevo León", "Puebla", "Yucatán"];
  return [...branches].sort((a, b) => {
    const region = rank.indexOf(a.region) - rank.indexOf(b.region);
    if (region !== 0) return region;
    return a.city.localeCompare(b.city, "es") || a.name.localeCompare(b.name, "es");
  });
}

function logEntry(now: number, tone: LogEntry["tone"], text: string): LogEntry {
  return { id: uid("log"), at: now, tone, text };
}

function branchName(branches: Map<string, Branch>, branchId: string) {
  return branches.get(branchId)?.name ?? "la sucursal";
}

function readyFor(machine: Machine, kind: CommandKind) {
  if (machine.rebooting) return false;
  if (kind === "maintenance_off") return machine.maintenance;
  if (kind === "maintenance_on") return !machine.maintenance;
  if (machine.maintenance) return false;
  return machine.link === "up";
}

function applyCommand(
  machine: Machine,
  command: Command,
  now: number,
  branches: Map<string, Branch>,
) {
  const where = branchName(branches, machine.branchId);
  switch (command.kind) {
    case "restart":
      machine.rebooting = true;
      machine.link = "down";
      machine.backAt = now + 7000;
      machine.screenNotice = null;
      machine.locked = false;
      machine.cpu = 0;
      return {
        status: "done" as const,
        result: "Reinicio aceptado. Tarda unos segundos en volver.",
        entry: logEntry(now, "info", `${machine.name} en ${where} está reiniciando.`),
        cancelOthers: false,
      };
    case "lock":
      machine.locked = true;
      return {
        status: "done" as const,
        result: `Sesión de ${machine.user} bloqueada. El escritorio pide desbloqueo.`,
        entry: logEntry(
          now,
          "ok",
          `${command.actor} bloqueó la sesión de ${machine.user} en ${machine.name} (${where}).`,
        ),
        cancelOthers: false,
      };
    case "message": {
      const text = command.message ?? "";
      machine.screenNotice = { text, until: now + 5 * 60 * 1000 };
      return {
        status: "done" as const,
        result: "El aviso quedó en pantalla.",
        entry: logEntry(
          now,
          "ok",
          `${command.actor} dejó un aviso en ${machine.name} (${where}): «${text}».`,
        ),
        cancelOthers: false,
      };
    }
    case "inventory": {
      const result = `${machine.os}. Disco ${Math.round(machine.disk)}%, memoria ${Math.round(machine.ram)}%, sesión ${machine.user}.`;
      return {
        status: "done" as const,
        result,
        entry: logEntry(now, "info", `Inventario de ${machine.name} en ${where}: ${result}`),
        cancelOthers: false,
      };
    }
    case "maintenance_on":
      machine.maintenance = true;
      return {
        status: "done" as const,
        result: "Quedó en mantenimiento.",
        entry: logEntry(
          now,
          "warn",
          `${command.actor} puso ${machine.name} (${where}) en mantenimiento.`,
        ),
        cancelOthers: true,
      };
    case "maintenance_off":
      machine.maintenance = false;
      return {
        status: "done" as const,
        result: "Ya acepta órdenes otra vez.",
        entry: logEntry(
          now,
          "ok",
          `${command.actor} sacó ${machine.name} (${where}) de mantenimiento.`,
        ),
        cancelOthers: false,
      };
  }
}

export function tick(state: FleetState, now: number): FleetState {
  const logs = [...state.logs];
  const branches = new Map(state.branches.map((branch) => [branch.id, branch]));

  const machines = state.machines.map((machine) => {
    const next = { ...machine };
    if (next.screenNotice && next.screenNotice.until <= now) next.screenNotice = null;

    if (next.rebooting && next.backAt !== null && now >= next.backAt) {
      next.rebooting = false;
      next.backAt = null;
      next.link = "up";
      next.lastSeen = now;
      next.uptimeHours = 0.1;
      next.cpu = 12;
      next.ram = clamp(next.ram, 36, 55);
      logs.unshift(
        logEntry(now, "ok", `${next.name} en ${branchName(branches, next.branchId)} ya encendió.`),
      );
      return next;
    }

    if (next.link === "up" && !next.maintenance && !next.rebooting) {
      const swing = (Math.random() * 2 - 1) * (next.hot ? 3 : 5);
      next.cpu = clamp(next.cpu + swing, next.hot ? 90 : 8, next.hot ? 98 : 68);
      next.ram = clamp(next.ram + (Math.random() * 2 - 1) * 2, 24, 92);
      next.lastSeen = now;
      if (next.flaky && Math.random() < 0.012) {
        next.link = "down";
        logs.unshift(
          logEntry(
            now,
            "warn",
            `${next.name} en ${branchName(branches, next.branchId)} perdió la señal.`,
          ),
        );
      }
      return next;
    }

    if (next.link === "down" && next.flaky && !next.rebooting && Math.random() < 0.08) {
      next.link = "up";
      next.lastSeen = now;
      logs.unshift(
        logEntry(
          now,
          "ok",
          `${next.name} en ${branchName(branches, next.branchId)} volvió a reportar.`,
        ),
      );
    }

    return next;
  });

  const byId = new Map(machines.map((machine) => [machine.id, machine]));
  const commands = state.commands.map((command) => ({ ...command }));

  for (const command of commands) {
    const machine = byId.get(command.machineId);
    if (!machine) continue;
    if (command.status === "queued" && now - command.createdAt >= QUEUED_MS && readyFor(machine, command.kind)) {
      command.status = "running";
      command.startedAt = now;
    }
    if (
      command.status === "running" &&
      command.startedAt !== null &&
      now - command.startedAt >= RUNNING_MS
    ) {
      const outcome = applyCommand(machine, command, now, branches);
      command.status = outcome.status;
      command.result = outcome.result;
      command.finishedAt = now;
      logs.unshift(outcome.entry);
      if (outcome.cancelOthers) {
        for (const other of commands) {
          if (
            other.id !== command.id &&
            other.machineId === machine.id &&
            (other.status === "queued" || other.status === "running")
          ) {
            other.status = "failed";
            other.finishedAt = now;
            other.result = "Cancelada: el equipo pasó a mantenimiento.";
          }
        }
      }
    }
  }

  const kept: Command[] = [];
  let finished = 0;
  for (const command of commands) {
    if (command.status === "queued" || command.status === "running") {
      kept.push(command);
    } else if (finished < 40) {
      kept.push(command);
      finished += 1;
    }
  }

  return { ...state, machines, commands: kept, logs: logs.slice(0, 80) };
}

export function enqueueCommand(
  state: FleetState,
  input: { machineId: string; kind: CommandKind; message?: string; actor: string },
  now: number,
): ActionResult & { state?: FleetState } {
  const machine = state.machines.find((item) => item.id === input.machineId);
  if (!machine) return { ok: false, error: "No encontré ese equipo." };

  const actor = input.actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const pending = state.commands.some(
    (command) =>
      command.machineId === machine.id &&
      command.kind === input.kind &&
      (command.status === "queued" || command.status === "running"),
  );

  if (machine.rebooting) {
    return { ok: false, error: `${machine.name} se está reiniciando. Espera a que encienda.` };
  }
  if (pending) return { ok: false, error: "Esa orden ya está en camino." };

  if (input.kind === "message") {
    const text = (input.message ?? "").trim();
    if (!text) return { ok: false, error: "Escribe el aviso." };
    if (text.length > 180) return { ok: false, error: "El aviso cabe en 180 caracteres." };
  }

  if (input.kind === "maintenance_off" && !machine.maintenance) {
    return { ok: false, error: "Ese equipo no está en mantenimiento." };
  }
  if (input.kind === "maintenance_on" && machine.maintenance) {
    return { ok: false, error: "Ya está en mantenimiento." };
  }
  if (
    input.kind !== "maintenance_on" &&
    input.kind !== "maintenance_off" &&
    machine.maintenance
  ) {
    return { ok: false, error: "Está en mantenimiento. Quítalo antes de mandar otra orden." };
  }
  if ((input.kind === "lock" || input.kind === "message") && machine.link === "down") {
    return {
      ok: false,
      error: "No hay sesión activa. Cuando vuelva la señal puedes bloquear o dejar el aviso.",
    };
  }

  const queued = machine.link === "down" && (input.kind === "restart" || input.kind === "inventory");
  const command: Command = {
    id: uid("cmd"),
    machineId: machine.id,
    kind: input.kind,
    message: input.kind === "message" ? (input.message ?? "").trim() : null,
    status: "queued",
    actor,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    result: null,
  };

  const logs = queued
    ? [
        logEntry(
          now,
          "info",
          `${actor} dejó en cola ${orderPhrase(input.kind)} de ${machine.name} en ${where}. Sale cuando vuelva la señal.`,
        ),
        ...state.logs,
      ].slice(0, 80)
    : state.logs;

  return {
    ok: true,
    queued,
    state: { ...state, commands: [command, ...state.commands], logs },
  };
}

export function markOnline(state: FleetState, machineId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  if (machine.rebooting) {
    return { ok: false as const, error: "Sigue reiniciando. Va a reportar solo." };
  }
  if (machine.link === "up") return { ok: false as const, error: "Ya tiene señal." };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) =>
    item.id === machineId ? { ...item, link: "up" as const, lastSeen: now, flaky: false } : item,
  );

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "ok", `${name} registró señal de ${machine.name} en ${where}.`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function recordDiskCleanup(state: FleetState, machineId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  if (machine.disk < 88) return { ok: false as const, error: "El disco ya no está en alerta." };
  if (machine.link === "down" || machine.rebooting) {
    return { ok: false as const, error: "Espera a que el equipo esté en línea." };
  }

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) => (item.id === machineId ? { ...item, disk: 46 } : item));

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(
          now,
          "ok",
          `${name} registró que en ${where} ya liberaron espacio en ${machine.name}. El disco quedó en 46%.`,
        ),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function withOperator(state: FleetState, name: string): FleetState {
  const operator = name.trim().slice(0, 40) || "Mesa central";
  return { ...state, operator };
}

export function noteDesktop(state: FleetState, machineId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  if (deskBlock(machine)) return { ok: true as const, queued: false };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      logs: [
        logEntry(now, "info", `${name} abrió el escritorio de ${machine.name} en ${where}.`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function saveDeskFile(
  state: FleetState,
  machineId: string,
  fileId: string,
  body: string,
  actor: string,
  now: number,
) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  const block = deskBlock(machine);
  if (block) return { ok: false as const, error: block };
  if (machine.locked) return { ok: false as const, error: "La sesión está bloqueada. Desbloquéala para editar." };

  const file = machine.files.find((item) => item.id === fileId);
  if (!file) return { ok: false as const, error: "Ese archivo ya no está en el escritorio." };
  const nextBody = body.replace(/\r\n/g, "\n");
  if (nextBody.length > DESK_BODY_LIMIT) {
    return { ok: false as const, error: `El archivo cabe en ${DESK_BODY_LIMIT} caracteres.` };
  }
  if (nextBody === file.body) return { ok: true as const, queued: false };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) =>
    item.id === machineId
      ? { ...item, files: item.files.map((entry) => (entry.id === fileId ? { ...entry, body: nextBody } : entry)) }
      : item,
  );

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "ok", `${name} editó «${file.name}» en ${machine.name} (${where}).`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function createDeskNote(state: FleetState, machineId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  const block = deskBlock(machine);
  if (block) return { ok: false as const, error: block };
  if (machine.locked) return { ok: false as const, error: "La sesión está bloqueada. Desbloquéala para editar." };
  if (machine.files.length >= DESK_FILE_LIMIT) {
    return { ok: false as const, error: "Este escritorio ya tiene 8 archivos. Edita uno de los que están." };
  }

  const file = { id: uid("nota"), name: nextNoteName(machine.files), body: "" };
  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) =>
    item.id === machineId ? { ...item, files: [...item.files, file] } : item,
  );

  return {
    ok: true as const,
    queued: false,
    fileId: file.id,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "info", `${name} creó «${file.name}» en el escritorio de ${machine.name} (${where}).`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function deleteDeskFile(state: FleetState, machineId: string, fileId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  const block = deskBlock(machine);
  if (block) return { ok: false as const, error: block };
  if (machine.locked) return { ok: false as const, error: "La sesión está bloqueada. Desbloquéala para borrar." };
  const file = machine.files.find((item) => item.id === fileId);
  if (!file) return { ok: false as const, error: "Ese archivo ya no está en el equipo." };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) =>
    item.id === machineId ? { ...item, files: item.files.filter((entry) => entry.id !== fileId) } : item,
  );

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "warn", `${name} eliminó «${file.name}» en ${machine.name} (${where}).`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function saveHostScreen(state: FleetState, machineId: string, body: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  const block = deskBlock(machine);
  if (block) return { ok: false as const, error: block };
  if (machine.locked) return { ok: false as const, error: "La sesión está bloqueada. Desbloquéala para editar." };
  const nextBody = body.replace(/\r\n/g, "\n");
  if (nextBody.length > DESK_BODY_LIMIT) {
    return { ok: false as const, error: `La pantalla cabe en ${DESK_BODY_LIMIT} caracteres.` };
  }
  if (nextBody === (machine.screenText ?? "")) return { ok: true as const, queued: false };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) => (item.id === machineId ? { ...item, screenText: nextBody } : item));

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "ok", `${name} modificó la pantalla de ${machine.user} en ${machine.name} (${where}).`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function unlockSession(state: FleetState, machineId: string, actor: string, now: number) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false as const, error: "No encontré ese equipo." };
  const block = deskBlock(machine);
  if (block) return { ok: false as const, error: block };
  if (!machine.locked) return { ok: false as const, error: "La sesión ya está abierta." };

  const name = actor.trim() || "Mesa central";
  const where = state.branches.find((branch) => branch.id === machine.branchId)?.name ?? "la sucursal";
  const machines = state.machines.map((item) => (item.id === machineId ? { ...item, locked: false } : item));

  return {
    ok: true as const,
    queued: false,
    state: {
      ...state,
      machines,
      logs: [
        logEntry(now, "ok", `${name} desbloqueó la sesión de ${machine.user} en ${machine.name} (${where}).`),
        ...state.logs,
      ].slice(0, 80),
    },
  };
}

export function freshFleet(now: number) {
  return withDesktop(createSeed(now));
}

export function isFleetState(value: unknown): value is FleetState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FleetState;
  return (
    candidate.version === 1 &&
    typeof candidate.operator === "string" &&
    Array.isArray(candidate.branches) &&
    Array.isArray(candidate.machines) &&
    candidate.machines.length > 0 &&
    Array.isArray(candidate.commands) &&
    Array.isArray(candidate.logs)
  );
}
