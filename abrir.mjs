import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const url = "http://127.0.0.1:3847";

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

async function isUp() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

function openBrowser() {
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

async function waitUntilUp() {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    if (await isUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

if (!existsSync(join(root, "node_modules"))) {
  console.log("Primera vez: npm va a instalar lo que Vigía necesita.");
  await run("npm", ["install"]);
}

if (await isUp()) {
  console.log(`Vigía ya está abierto en ${url}`);
  openBrowser();
  process.exit(0);
}

console.log("Abriendo Vigía con npm…");
const server = spawn("npm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

server.on("error", (error) => {
  console.error("No pude ejecutar npm. Instala Node.js desde https://nodejs.org");
  console.error(error.message);
  process.exit(1);
});

const ready = await waitUntilUp();
if (ready) {
  console.log(`Listo. Vigía está en ${url}`);
  openBrowser();
} else {
  console.log(`npm sigue arrancando. Cuando termine, abre ${url}`);
}

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
