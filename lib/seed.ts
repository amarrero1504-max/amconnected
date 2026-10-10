import { defaultFiles } from "@/lib/desk";
import type { Branch, Command, FleetState, Machine, Role } from "@/lib/types";

type Draft = {
  name: string;
  role: Role;
  user: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  uptimeHours?: number;
  link?: "up" | "down";
  maintenance?: boolean;
  note?: string;
  flaky?: boolean;
  hot?: boolean;
  lastSeenAgoMs?: number;
  os?: string;
};

const branches: Branch[] = [
  {
    id: "gdl-centro",
    name: "Centro",
    city: "Guadalajara",
    region: "Jalisco",
    address: "Av. Juárez 214, Zona Centro",
    manager: "Marisol Andrade",
    phone: "33 1000 2214",
    hours: "8:00–21:00",
  },
  {
    id: "gdl-americana",
    name: "Americana",
    city: "Guadalajara",
    region: "Jalisco",
    address: "Av. Américas 1180",
    manager: "Héctor Ruiz",
    phone: "33 1000 1180",
    hours: "8:00–22:00",
  },
  {
    id: "zapopan",
    name: "Zapopan Centro",
    city: "Zapopan",
    region: "Jalisco",
    address: "Hidalgo 45",
    manager: "Carmen Solís",
    phone: "33 1000 0045",
    hours: "8:00–21:00",
  },
  {
    id: "tlaquepaque",
    name: "Tlaquepaque",
    city: "San Pedro Tlaquepaque",
    region: "Jalisco",
    address: "Independencia 88",
    manager: "Luis Navarro",
    phone: "33 1000 0088",
    hours: "9:00–21:00",
  },
  {
    id: "roma",
    name: "Roma Norte",
    city: "Ciudad de México",
    region: "Ciudad de México",
    address: "Córdoba 42",
    manager: "Regina Palma",
    phone: "55 1000 0042",
    hours: "9:00–22:00",
  },
  {
    id: "san-pedro",
    name: "San Pedro",
    city: "San Pedro Garza García",
    region: "Nuevo León",
    address: "Vasconcelos 310",
    manager: "Diego Treviño",
    phone: "81 1000 0310",
    hours: "8:00–22:00",
  },
  {
    id: "angelopolis",
    name: "Angelópolis",
    city: "Puebla",
    region: "Puebla",
    address: "Blvd. Atlixcáyotl 2200",
    manager: "Paola Méndez",
    phone: "22 1000 2200",
    hours: "10:00–21:00",
  },
  {
    id: "merida",
    name: "García Ginerés",
    city: "Mérida",
    region: "Yucatán",
    address: "Colón 501",
    manager: "Sofía Cauich",
    phone: "99 1000 0501",
    hours: "8:00–21:00",
  },
];

function machinesFor(
  branchId: string,
  subnet: number,
  drafts: Draft[],
  now: number,
): Machine[] {
  return drafts.map((draft, index) => {
    const link = draft.link ?? "up";
    return {
      id: `${branchId}-${draft.name.toLowerCase()}`,
      branchId,
      name: draft.name,
      role: draft.role,
      os: draft.os ?? (draft.role === "almacen" ? "Windows 10 Pro" : "Windows 11 Pro"),
      ip: `10.${subnet}.1.${10 + index}`,
      user: draft.user,
      cpu: draft.cpu ?? 16 + ((index * 7) % 18),
      ram: draft.ram ?? 40 + ((index * 5) % 16),
      disk: draft.disk ?? 44 + ((index * 9) % 18),
      uptimeHours: draft.uptimeHours ?? 26 + index * 11,
      link,
      maintenance: draft.maintenance ?? false,
      note: draft.note ?? null,
      flaky: draft.flaky ?? false,
      hot: draft.hot ?? false,
      rebooting: false,
      backAt: null,
      lastSeen: now - (draft.lastSeenAgoMs ?? (link === "down" ? 4 * 60 * 1000 : 4000)),
      locked: false,
      files: defaultFiles(draft.role, branches.find((branch) => branch.id === branchId)?.name ?? "Sucursal", draft.name),
      screenText: null,
      screenNotice: null,
    };
  });
}

export function createSeed(now: number): FleetState {
  const machines = [
    ...machinesFor("gdl-centro", 10, [
      { name: "CAJA-01", role: "caja", user: "ana.rios", disk: 61, cpu: 22 },
      { name: "CAJA-02", role: "caja", user: "luis.mora", disk: 93, cpu: 28, uptimeHours: 86 },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.centro", ram: 51 },
      { name: "OFICINA", role: "oficina", user: "gerencia", disk: 58 },
    ], now),
    ...machinesFor("gdl-americana", 11, [
      { name: "CAJA-01", role: "caja", user: "rosa.vega", disk: 54, cpu: 19 },
      { name: "CAJA-02", role: "caja", user: "ivan.sol", disk: 49 },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.americana" },
      { name: "OFICINA", role: "oficina", user: "gerencia", ram: 47 },
    ], now),
    ...machinesFor("zapopan", 12, [
      { name: "CAJA-01", role: "caja", user: "lucia.paz" },
      { name: "CAJA-02", role: "caja", user: "marco.gil", disk: 66 },
      {
        name: "OFICINA",
        role: "oficina",
        user: "gerencia",
        link: "down",
        lastSeenAgoMs: 26 * 60 * 60 * 1000,
        note: "Anoche se fue la luz en el local y el módem no volvió.",
      },
      { name: "ALMACEN", role: "almacen", user: "almacen", disk: 71, os: "Windows 10 Pro" },
    ], now),
    ...machinesFor("tlaquepaque", 13, [
      {
        name: "CAJA-01",
        role: "caja",
        user: "caja.1",
        maintenance: true,
        note: "Cambio de impresora de tickets. La caja 2 cubre mientras tanto.",
      },
      { name: "CAJA-02", role: "caja", user: "caja.2", cpu: 31 },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.tlaq" },
    ], now),
    ...machinesFor("roma", 14, [
      { name: "CAJA-01", role: "caja", user: "elena.cruz" },
      { name: "KIOSCO", role: "kiosco", user: "kiosco", hot: true, cpu: 94, disk: 41, ram: 77 },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.roma" },
      { name: "OFICINA", role: "oficina", user: "gerencia", disk: 52 },
    ], now),
    ...machinesFor("san-pedro", 15, [
      { name: "CAJA-01", role: "caja", user: "pablo.nieto" },
      { name: "CAJA-02", role: "caja", user: "irene.salas", disk: 91, uptimeHours: 140 },
      { name: "ALMACEN", role: "almacen", user: "almacen", disk: 63, os: "Windows 10 Pro" },
      { name: "OFICINA", role: "oficina", user: "gerencia" },
    ], now),
    ...machinesFor("angelopolis", 16, [
      { name: "CAJA-01", role: "caja", user: "valeria.ortiz" },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.puebla", ram: 84, cpu: 36 },
      { name: "OFICINA", role: "oficina", user: "gerencia", disk: 57 },
    ], now),
    ...machinesFor("merida", 17, [
      { name: "CAJA-01", role: "caja", user: "diego.pool" },
      {
        name: "CAJA-02",
        role: "caja",
        user: "caja.2",
        link: "down",
        flaky: true,
        lastSeenAgoMs: 6 * 60 * 1000,
        note: "El acceso del local se cae a ratos. Suele volver solo.",
      },
      { name: "MOSTRADOR", role: "mostrador", user: "piso.merida" },
      { name: "OFICINA", role: "oficina", user: "gerencia", disk: 48 },
    ], now),
  ];

  const inventory = machines.find((machine) => machine.id === "gdl-americana-caja-01");
  const commands: Command[] = inventory
    ? [
        {
          id: "cmd-seed-inventario",
          machineId: inventory.id,
          kind: "inventory",
          message: null,
          status: "done",
          actor: "Mesa central",
          createdAt: now - 2 * 60 * 60 * 1000,
          startedAt: now - 2 * 60 * 60 * 1000 + 2000,
          finishedAt: now - 2 * 60 * 60 * 1000 + 5000,
          result: `${inventory.os}. Disco ${Math.round(inventory.disk)}%, memoria ${Math.round(inventory.ram)}%, sesión ${inventory.user}.`,
        },
      ]
    : [];

  return {
    version: 1,
    operator: "Mesa central",
    branches,
    machines,
    commands,
    logs: [
      {
        id: "log-zapopan",
        at: now - 26 * 60 * 60 * 1000,
        tone: "bad",
        text: "OFICINA en Zapopan Centro sigue sin señal desde anoche.",
      },
      {
        id: "log-disco-centro",
        at: now - 3 * 60 * 60 * 1000,
        tone: "warn",
        text: "CAJA-02 en Centro tiene el disco al 93%.",
      },
      {
        id: "log-tlaq",
        at: now - 90 * 60 * 1000,
        tone: "info",
        text: "CAJA-01 en Tlaquepaque está en mantenimiento: cambio de impresora de tickets.",
      },
      {
        id: "log-americana",
        at: now - 2 * 60 * 60 * 1000,
        tone: "ok",
        text: "Mesa central pidió inventario de CAJA-01 en Americana. Todo en orden.",
      },
    ],
  };
}
