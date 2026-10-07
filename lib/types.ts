export type Role = "caja" | "mostrador" | "oficina" | "almacen" | "kiosco";

export type CommandKind =
  | "restart"
  | "lock"
  | "message"
  | "inventory"
  | "maintenance_on"
  | "maintenance_off";

export type CommandStatus = "queued" | "running" | "done" | "failed";

export type Status = "online" | "offline" | "alert" | "maintenance" | "rebooting";

export type Branch = {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string;
  manager: string;
  phone: string;
  hours: string;
};

export type DeskFile = {
  id: string;
  name: string;
  body: string;
};

export type Machine = {
  id: string;
  branchId: string;
  name: string;
  role: Role;
  os: string;
  ip: string;
  user: string;
  cpu: number;
  ram: number;
  disk: number;
  uptimeHours: number;
  link: "up" | "down";
  maintenance: boolean;
  note: string | null;
  flaky: boolean;
  hot: boolean;
  rebooting: boolean;
  backAt: number | null;
  lastSeen: number;
  locked: boolean;
  files: DeskFile[];
  screenNotice: { text: string; until: number } | null;
};

export type Command = {
  id: string;
  machineId: string;
  kind: CommandKind;
  message: string | null;
  status: CommandStatus;
  actor: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  result: string | null;
};

export type LogTone = "info" | "ok" | "warn" | "bad";

export type LogEntry = {
  id: string;
  at: number;
  tone: LogTone;
  text: string;
};

export type FleetState = {
  version: 1;
  operator: string;
  branches: Branch[];
  machines: Machine[];
  commands: Command[];
  logs: LogEntry[];
};

export type MachineView = Machine & {
  status: Status;
  branch: Branch;
  issue: string | null;
};

export type FleetStats = {
  total: number;
  branches: number;
  online: number;
  offline: number;
  alert: number;
  maintenance: number;
  rebooting: number;
};

export type ActionResult =
  | { ok: true; queued: boolean }
  | { ok: false; error: string };
