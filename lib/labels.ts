import type { CommandKind, CommandStatus, Role, Status } from "@/lib/types";

export const ROLE_LABEL: Record<Role, string> = {
  caja: "Caja",
  mostrador: "Mostrador",
  oficina: "Oficina",
  almacen: "Almacén",
  kiosco: "Kiosco",
};

export const STATUS_LABEL: Record<Status, string> = {
  online: "En línea",
  offline: "Sin señal",
  alert: "Alerta",
  maintenance: "Mantenimiento",
  rebooting: "Reiniciando",
};

export const KIND_NOUN: Record<CommandKind, string> = {
  restart: "Reinicio",
  lock: "Bloqueo de sesión",
  message: "Aviso en pantalla",
  inventory: "Inventario",
  maintenance_on: "Entrar a mantenimiento",
  maintenance_off: "Salir de mantenimiento",
};

export const COMMAND_STATUS_LABEL: Record<CommandStatus, string> = {
  queued: "En cola",
  running: "En proceso",
  done: "Hecho",
  failed: "No se pudo",
};

export const REGION_ORDER = [
  "Jalisco",
  "Ciudad de México",
  "Nuevo León",
  "Puebla",
  "Yucatán",
];

export function orderPhrase(kind: CommandKind) {
  switch (kind) {
    case "restart":
      return "el reinicio";
    case "lock":
      return "el bloqueo de sesión";
    case "message":
      return "un aviso en pantalla";
    case "inventory":
      return "el inventario";
    case "maintenance_on":
      return "el mantenimiento";
    case "maintenance_off":
      return "el fin del mantenimiento";
  }
}
