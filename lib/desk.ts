import type { DeskFile, Machine, Role } from "@/lib/types";

export const DESK_BODY_LIMIT = 4000;
export const DESK_FILE_LIMIT = 8;

export function deskBlock(machine: Pick<Machine, "link" | "rebooting">) {
  if (machine.rebooting) return "Se está reiniciando. La imagen vuelve cuando encienda.";
  if (machine.link === "down") {
    return "No hay señal, así que no llega la imagen. Cuando el equipo reporte, el escritorio se abre desde aquí.";
  }
  return null;
}

export function nextNoteName(files: { name: string }[]) {
  const names = new Set(files.map((file) => file.name));
  if (!names.has("Nota de mesa.txt")) return "Nota de mesa.txt";
  for (let n = 2; n < 20; n += 1) {
    const name = `Nota de mesa ${n}.txt`;
    if (!names.has(name)) return name;
  }
  return "Nota de mesa.txt";
}

export function defaultFiles(role: Role, branch: string, machine: string): DeskFile[] {
  switch (role) {
    case "caja":
      return [
        {
          id: "corte",
          name: "Corte del día.txt",
          body: `Corte de ${machine}\n${branch}\n\nEfectivo en cajón: $4,280\nTarjeta: $6,150\nFaltante: $0\n\nTurno de la mañana cerrado. El de la tarde sigue abierto.`,
        },
        {
          id: "notas",
          name: "Notas de caja.txt",
          body: "Pendiente:\n- Confirmar el cambio de $500 del mediodía.\n- El fiado del cliente de la esquina va en la libreta, no en este archivo.",
        },
      ];
    case "mostrador":
      return [
        {
          id: "faltantes",
          name: "Faltantes de anaquel.txt",
          body: `${branch} · ${machine}\n\n- Leche entera 1 L, pasillo 2\n- Huevo blanco, refrigerador\n- Jabón de barra, pasillo 4\n\nReponer antes de las 6.`,
        },
        {
          id: "precios",
          name: "Precios de mostrador.txt",
          body: "Arroz 1 kg — $27.50\nFrijol 1 kg — $34.00\nAceite 900 ml — $48.00\nPan de caja — $42.00\n\nSi el anaquel no coincide, avisar a oficina.",
        },
      ];
    case "oficina":
      return [
        {
          id: "pedido",
          name: "Pedido de la semana.txt",
          body: `Pedido de ${branch}\n\nLeche 24 piezas\nAceite 12 piezas\nAzúcar 10 bultos\nDetergente 8 cajas\n\nEntrega: jueves por la mañana.`,
        },
        {
          id: "pendientes",
          name: "Pendientes de gerencia.txt",
          body: `${machine}\n\n- Hablar con el proveedor del pan.\n- Revisar el corte de las cajas antes de cerrar.\n- El módem está en el estante de la oficina.`,
        },
      ];
    case "almacen":
      return [
        {
          id: "entradas",
          name: "Entradas de hoy.txt",
          body: `${branch}\n\nRecibido:\n- 8 cajas de aceite\n- 4 costales de arroz\n- 2 cajas de jabón\n\nFaltó el azúcar. Llega mañana.`,
        },
        {
          id: "conteo",
          name: "Conteo de pasillo.txt",
          body: "Pasillo 1, estante alto: 36 latas de atún.\nPasillo 3: 14 botellas de aceite.\n\nAnotar lo que se mueva a piso.",
        },
      ];
    case "kiosco":
      return [
        {
          id: "aviso",
          name: "Aviso del kiosco.txt",
          body: `${branch}\n\nEn pantalla: toque para empezar.\nSi se traba, reiniciar desde la mesa y avisar a piso.`,
        },
        {
          id: "notas",
          name: "Notas del kiosco.txt",
          body: "La pantalla se calienta si se queda el anuncio del día.\nNo pegarle etiquetas al vidrio.",
        },
      ];
  }
}

export function screenOf(
  machine: Pick<Machine, "id" | "name" | "role" | "user" | "cpu">,
  branch: string,
) {
  const n = mix(machine.id);
  const goods = [
    ["Leche Lala 1 L", "28.50"],
    ["Tortilla de maíz 1 kg", "26.00"],
    ["Huevo blanco 18 pzas", "62.00"],
    ["Frijol bayo 1 kg", "34.00"],
    ["Aceite 900 ml", "48.00"],
    ["Arroz 1 kg", "27.50"],
    ["Jabón de barra", "18.00"],
    ["Refresco 2 L", "35.00"],
  ];

  switch (machine.role) {
    case "caja": {
      const lines = [0, 1, 2, 3].map((offset) => goods[(n + offset) % goods.length]);
      const total = lines.reduce((sum, line) => sum + Number(line[1]), 0);
      const ticket = 1000 + (n % 8000);
      return {
        title: "Punto de venta",
        detail: `Ticket ${ticket} · ${machine.user}`,
        body: [
          "Abarrotes Del Valle",
          branch,
          machine.name,
          "",
          ...lines.map(([item, price]) => `${item.padEnd(24, " ")}${price}`),
          "",
          `Total`.padEnd(24, " ") + total.toFixed(2),
          "",
          "Esperando el pago.",
        ].join("\n"),
      };
    }
    case "mostrador":
      return {
        title: "Consulta de precio",
        detail: machine.user,
        body: [
          branch,
          "",
          "Última consulta",
          goods[n % goods.length][0],
          `$${goods[n % goods.length][1]}`,
          "",
          "El código del anaquel coincide.",
        ].join("\n"),
      };
    case "oficina":
      return {
        title: "Pedido a proveedor",
        detail: branch,
        body: [
          `Abierta por ${machine.user}`,
          "",
          "Leche          24",
          "Aceite         12",
          "Azúcar         10",
          "",
          "Borrador. Todavía no se envía.",
        ].join("\n"),
      };
    case "almacen":
      return {
        title: "Recepción",
        detail: machine.name,
        body: ["Hoy entró:", "", "Aceite     8 cajas", "Arroz      4 costales", "Jabón      2 cajas", "", "Azúcar pendiente."].join(
          "\n",
        ),
      };
    case "kiosco":
      return {
        title: "Autoservicio",
        detail: branch,
        body: [
          "Toque la pantalla para empezar",
          "",
          "Abarrotes Del Valle",
          branch,
          "",
          machine.cpu >= 90 ? "La pantalla va lenta." : "Listo para el siguiente cliente.",
        ].join("\n"),
      };
  }
}

export function withDesktop<T extends { branches: { id: string; name: string }[]; machines: Machine[] }>(state: T): T {
  return {
    ...state,
    machines: state.machines.map((machine) => {
      const branch = state.branches.find((item) => item.id === machine.branchId)?.name ?? "Sucursal";
      return {
        ...machine,
        locked: machine.locked === true,
        files: validFiles(machine.files) ?? defaultFiles(machine.role, branch, machine.name),
      };
    }),
  };
}

function validFiles(value: unknown): DeskFile[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const files: DeskFile[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const file = item as Partial<DeskFile>;
    if (typeof file.id !== "string" || typeof file.name !== "string" || typeof file.body !== "string") continue;
    if (!file.id || !file.name) continue;
    files.push({
      id: file.id.slice(0, 40),
      name: file.name.slice(0, 60),
      body: file.body.slice(0, DESK_BODY_LIMIT),
    });
  }
  return files.length > 0 ? files.slice(0, 12) : null;
}

function mix(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return n;
}
