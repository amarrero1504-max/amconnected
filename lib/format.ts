export function formatAccess(from: number, now: number) {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "hace 1 minuto" : `hace ${minutes} minutos`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hace un día";
  if (days < 14) return `hace ${days} días`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(new Date(from));
}

export function formatRelative(from: number, now: number) {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 15) return "ahora";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

export function formatRemaining(until: number, now: number) {
  const seconds = Math.max(0, Math.round((until - now) / 1000));
  if (seconds < 15) return "un momento más";
  if (seconds < 60) return `${seconds} s más`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes === 1 ? "1 min más" : `${minutes} min más`;
}

export function formatUptime(hours: number) {
  if (hours < 1) return "menos de 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 día" : `${days} días`;
}

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  }).format(date);
}

export function greeting(date: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("es-MX", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Mexico_City",
    }).format(date),
  );
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function telHref(phone: string) {
  return `tel:+52${phone.replace(/\D/g, "")}`;
}

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
