import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanHostsFrom } from "./lib/lan.mjs";
import {
  BASE_PORT,
  PORT_TRIES,
  choosePort,
  claimLock,
  explainBlocked,
  explainCrash,
  explainFirewall,
  explainInstall,
  explainStuck,
  firewallAddArgs,
  firewallRuleName,
  isOurPanel,
  logSaysPortTaken,
  panelUrl,
  pidAlive,
  probePort,
  readLock,
  releaseLock,
  waitForOurPanel,
  writeLock,
} from "./lib/launcher.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const lockId = createHash("sha1").update(root).digest("hex").slice(0, 8);
const lockFile = join(tmpdir(), `am-connect-${lockId}.lock`);
const readyTimeoutMs = 90_000;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} terminó con código ${code ?? "desconocido"}`));
    });
  });
}

function spawnQuiet(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function announce(port) {
  const links = lanHostsFrom(networkInterfaces(), String(port)).map((host) => `http://${host}`);
  console.log(`En esta computadora: ${panelUrl(port)}`);
  if (links.length === 0) {
    console.log("No encontré una dirección de red. Revisa el cable o el Wi-Fi de esta computadora.");
    return;
  }
  console.log("En el teléfono, con el Wi-Fi de este mismo módem (sin datos), abre:");
  for (const link of links) console.log(`  ${link}`);
}

async function ensureWindowsFirewall(port) {
  if (process.platform !== "win32") return true;
  const name = firewallRuleName(port);
  const present = await spawnQuiet("netsh", ["advfirewall", "firewall", "show", "rule", `name=${name}`]);
  if (present === 0) return true;

  console.log("Windows está bloqueando el teléfono. Acepta el permiso para abrir Vigía en la red.");
  const argList = firewallAddArgs(port).map((part) => `'${part.replaceAll("'", "''")}'`).join(",");
  const command = `Start-Process -FilePath netsh -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList ${argList}`;
  await spawnQuiet("powershell.exe", ["-NoProfile", "-Command", command]);
  return (await spawnQuiet("netsh", ["advfirewall", "firewall", "show", "rule", `name=${name}`])) === 0;
}

async function openForLan(port) {
  const allowed = await ensureWindowsFirewall(port);
  announce(port);
  if (!allowed) console.error(`\n${explainFirewall(port)}\n`);
  openBrowser(panelUrl(port));
}

function openBrowser(url) {
  let child;
  if (process.platform === "win32") {
    child = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
  } else {
    const command = process.platform === "darwin" ? "open" : "xdg-open";
    child = spawn(command, [url], { detached: true, stdio: "ignore" });
  }
  child.on("error", () => {
    console.log(`Ábrelo en el navegador: ${url}`);
  });
  child.unref();
}

async function showError(message) {
  console.error(`\n${message}\n`);
  if (process.platform !== "win32") return;
  const file = join(tmpdir(), `am-connect-error-${process.pid}.txt`);
  writeFileSync(file, message, "utf8");
  const literal = file.replace(/'/g, "''");
  const command = [
    "Add-Type -AssemblyName System.Windows.Forms",
    `$text = [System.IO.File]::ReadAllText('${literal}')`,
    "[void][System.Windows.Forms.MessageBox]::Show($text, 'AM-CONNECT', 'OK', 'Error')",
  ].join("; ");
  await new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-STA", "-Command", command], {
      stdio: "ignore",
    });
    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
  rmSync(file, { force: true });
}

function clearStaleLock() {
  const current = readLock(lockFile);
  if (current && !pidAlive(current.pid)) rmSync(lockFile, { force: true });
}

async function waitForPeer() {
  const deadline = Date.now() + readyTimeoutMs;
  while (Date.now() < deadline) {
    const other = readLock(lockFile);
    if (!other || !pidAlive(other.pid) || other.pid === process.pid) return null;
    if (other.port && (await isOurPanel(other.port, 800))) return other.port;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const other = readLock(lockFile);
  if (other && pidAlive(other.pid) && other.pid !== process.pid) return "stuck";
  return null;
}

async function takeOver() {
  for (;;) {
    clearStaleLock();
    if (claimLock(lockFile, { pid: process.pid, port: null })) return;
    const found = await waitForPeer();
    if (typeof found === "number") {
      console.log("El panel ya está abierto.");
      await openForLan(found);
      process.exit(0);
    }
    if (found === "stuck") {
      await showError(explainStuck());
      process.exit(1);
    }
  }
}

function startNext(port) {
  const bin = join(root, "node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [bin, "dev", "--hostname", "0.0.0.0", "--port", String(port)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function runServer(port) {
  const bin = join(root, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(bin)) {
    return { ok: false, portTaken: false, log: "No está Next.js en esta carpeta. Vuelve a abrir el archivo para que npm lo instale." };
  }

  const child = startNext(port);
  let log = "";
  const append = (chunk, stream) => {
    log += chunk.toString();
    stream.write(chunk);
  };
  child.stdout?.on("data", (chunk) => append(chunk, process.stdout));
  child.stderr?.on("data", (chunk) => append(chunk, process.stderr));

  let exitedCode = null;
  let stopWaiting = false;
  const exited = new Promise((resolve) => {
    child.once("exit", (code) => {
      exitedCode = code ?? 1;
      stopWaiting = true;
      resolve(exitedCode);
    });
    child.once("error", (error) => {
      log += `\n${error.message}`;
      exitedCode = 1;
      stopWaiting = true;
      resolve(1);
    });
  });

  const status = await Promise.race([
    waitForOurPanel(port, readyTimeoutMs, () => stopWaiting).then((up) => (up ? "up" : "timeout")),
    exited.then(() => "exit"),
  ]);

  if (status === "up") {
    console.log("Listo.");
    await openForLan(port);
    const code = await exited;
    return { ok: true, code };
  }

  if (child.exitCode === null && exitedCode === null) {
    child.kill();
    const killer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    await exited;
    clearTimeout(killer);
  } else {
    await exited;
  }

  return { ok: false, portTaken: logSaysPortTaken(log), log };
}

process.on("exit", () => releaseLock(lockFile, process.pid));

if (!existsSync(join(root, "node_modules"))) {
  console.log("Primera vez: npm va a instalar lo que el panel necesita.");
  try {
    await run("npm", ["install"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showError(explainInstall(message));
    process.exit(1);
  }
}

await takeOver();

let base = BASE_PORT;
for (let attempt = 0; attempt < PORT_TRIES; attempt += 1) {
  const count = Math.max(0, BASE_PORT + PORT_TRIES - base);
  const choice = await choosePort({ base, count, probe: probePort });

  if (choice.action === "open") {
    console.log("El panel ya está abierto.");
    await openForLan(choice.port);
    process.exit(0);
  }

  if (choice.action === "fail") {
    await showError(explainBlocked(choice.tried));
    process.exit(1);
  }

  if (choice.port !== BASE_PORT) {
    const blocked = choice.tried[0] ?? BASE_PORT;
    console.log(`El puerto ${blocked} está ocupado. El panel va a usar el ${choice.port}.`);
  }

  writeLock(lockFile, { pid: process.pid, port: choice.port });
  const result = await runServer(choice.port);
  if (result.ok) process.exit(result.code ?? 0);
  if (result.portTaken) {
    console.log(`El puerto ${choice.port} se ocupó al arrancar. Pruebo otro.`);
    base = choice.port + 1;
    continue;
  }

  await showError(explainCrash(result.log));
  process.exit(1);
}

await showError(explainBlocked([BASE_PORT]));
process.exit(1);
