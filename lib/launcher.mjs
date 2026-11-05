import { readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";

export const BASE_PORT = 3847;
export const PORT_TRIES = 21;
export const APP_ID = "am-connect";

export function panelUrl(port) {
  return `http://127.0.0.1:${port}`;
}

export function portsToTry(base = BASE_PORT, count = PORT_TRIES) {
  return Array.from({ length: count }, (_, index) => base + index);
}

export function isOurHealth(payload) {
  return Boolean(payload && payload.ok === true && payload.app === APP_ID);
}

export function logSaysPortTaken(text) {
  return /EADDRINUSE|address already in use|already in use|\bis in use\b/i.test(text);
}

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

export function readLock(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const port = Number.isInteger(parsed.port) ? parsed.port : null;
    const pid = Number.isInteger(parsed.pid) ? parsed.pid : null;
    return { pid, port };
  } catch {
    return null;
  }
}

export function claimLock(file, info) {
  try {
    writeFileSync(file, JSON.stringify(info), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

export function writeLock(file, info) {
  writeFileSync(file, JSON.stringify(info));
}

export function releaseLock(file, pid) {
  const current = readLock(file);
  if (current?.pid === pid) rmSync(file, { force: true });
}

export function canListen(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (server.listening) {
        server.close(() => resolve(ok));
        return;
      }
      resolve(ok);
    };
    server.once("error", () => finish(false));
    server.listen(port, host, () => finish(true));
  });
}

export function ephemeralPort(host = "0.0.0.0") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

export async function isOurPanel(port, timeoutMs = 800) {
  try {
    const response = await fetch(`${panelUrl(port)}/api/salud`, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    if (!response.ok) return false;
    return isOurHealth(await response.json());
  } catch {
    return false;
  }
}

export async function probePort(port) {
  if (await isOurPanel(port)) return "ours";
  if (await canListen(port)) return "free";
  return "busy";
}

export async function choosePort({
  base = BASE_PORT,
  count = PORT_TRIES,
  probe = probePort,
  reserve = ephemeralPort,
} = {}) {
  const tried = [];
  for (const port of portsToTry(base, count)) {
    tried.push(port);
    const state = await probe(port);
    if (state === "ours") return { action: "open", port, tried };
    if (state === "free") return { action: "start", port, tried };
  }
  try {
    const port = await reserve();
    if (port) return { action: "start", port, tried, moved: true };
  } catch {
    // The system could not hand out a free port either.
  }
  return { action: "fail", tried };
}

export async function waitForOurPanel(port, timeoutMs, shouldStop = () => false) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !shouldStop()) {
    const slice = Math.min(30_000, deadline - Date.now());
    if (slice > 0 && (await isOurPanel(port, slice))) return true;
    const pause = Math.min(400, deadline - Date.now());
    if (pause <= 0 || shouldStop()) break;
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
  return false;
}

export function explainBlocked(tried) {
  const first = tried[0] ?? BASE_PORT;
  const last = tried[tried.length - 1] ?? first;
  return [
    "No se pudo abrir el panel.",
    "",
    `El puerto ${first} está ocupado y los puertos hasta el ${last} también. El servidor no arrancó porque no quedó ninguno libre.`,
    "",
    "En la computadora del servidor central, cierra la otra ventana de AM-CONNECT si sigue abierta.",
    "Para ver qué programa usa el puerto:",
    `netstat -ano | findstr :${first}`,
    "",
    "Si ese comando no muestra a nadie, Windows reservó el puerto (suele pasar con Hyper-V, WSL o Docker) y Node lo reporta como ocupado. Revísalo con:",
    "netsh interface ipv4 show excludedportrange protocol=tcp",
  ].join("\n");
}

export function explainCrash(log) {
  const excerpt = log
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(-12)
    .join("\n");
  const lines = [
    "No se pudo abrir el panel.",
    "",
    "El puerto estaba libre. El servidor se cerró antes de responder.",
  ];
  if (excerpt) lines.push("", excerpt);
  else {
    lines.push(
      "",
      "No dejó ningún detalle. Revisa que Node.js esté instalado y que esta carpeta sea el proyecto completo, no solo el archivo .bat.",
    );
  }
  return lines.join("\n");
}

export function explainInstall(message) {
  return [
    "No se pudo abrir el panel.",
    "",
    "npm no pudo instalar lo que el panel necesita, y por eso el servidor no arrancó.",
    "",
    message,
  ].join("\n");
}

export function explainStuck() {
  return [
    "No se pudo abrir el panel.",
    "",
    "Hay otra ventana de AM-CONNECT abriéndose y no llegó a responder. Ciérrala (la ventana negra, no solo el navegador) y vuelve a abrir el archivo.",
  ].join("\n");
}
