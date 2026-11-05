import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  APP_ID,
  BASE_PORT,
  canListen,
  choosePort,
  claimLock,
  explainBlocked,
  explainCrash,
  explainInstall,
  isOurHealth,
  isOurPanel,
  logSaysPortTaken,
  panelUrl,
  probePort,
  readLock,
  releaseLock,
  waitForOurPanel,
  writeLock,
} from "./launcher.mjs";

function listen(server, port = 0, host = "127.0.0.1") {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

test("the health route uses the same app id", () => {
  const source = readFileSync(new URL("../app/api/salud/route.ts", import.meta.url), "utf8");
  assert.match(source, new RegExp(`app: "${APP_ID}"`));
});

test("recognizes this panel and ignores another page", () => {
  assert.equal(isOurHealth({ ok: true, app: APP_ID }), true);
  assert.equal(isOurHealth({ ok: true, app: "otro" }), false);
  assert.equal(isOurHealth({ ok: false, app: APP_ID }), false);
  assert.equal(isOurHealth(null), false);
});

test("reads the port-taken messages Next prints", () => {
  assert.equal(logSaysPortTaken("Error: listen EADDRINUSE: address already in use 0.0.0.0:3847"), true);
  assert.equal(logSaysPortTaken("Port 3847 is in use by process 412, using available port 3848 instead."), true);
  assert.equal(logSaysPortTaken("Failed to start server\nTypeError: bad config"), false);
});

test("opens the panel that is already running instead of starting another", async () => {
  const choice = await choosePort({
    probe: async (port) => (port === BASE_PORT ? "ours" : "free"),
    reserve: async () => 9,
  });
  assert.deepEqual(choice, { action: "open", port: BASE_PORT, tried: [BASE_PORT] });
});

test("uses the next free port when 3847 is busy", async () => {
  const choice = await choosePort({
    count: 3,
    probe: async (port) => (port === BASE_PORT ? "busy" : "free"),
    reserve: async () => 9,
  });
  assert.equal(choice.action, "start");
  assert.equal(choice.port, BASE_PORT + 1);
  assert.deepEqual(choice.tried, [BASE_PORT, BASE_PORT + 1]);
});

test("asks the system for a port when the whole range is blocked", async () => {
  const choice = await choosePort({
    count: 2,
    probe: async () => "busy",
    reserve: async () => 49152,
  });
  assert.equal(choice.action, "start");
  assert.equal(choice.port, 49152);
  assert.equal(choice.moved, true);
  assert.deepEqual(choice.tried, [BASE_PORT, BASE_PORT + 1]);
});

test("fails only when no port can be reserved", async () => {
  const choice = await choosePort({
    count: 2,
    probe: async () => "busy",
    reserve: async () => {
      throw new Error("sin puertos");
    },
  });
  assert.equal(choice.action, "fail");
  assert.deepEqual(choice.tried, [BASE_PORT, BASE_PORT + 1]);
});

test("explains a blocked port and a server that exited on its own", () => {
  const blocked = explainBlocked([3847, 3848]);
  assert.match(blocked, /3847 está ocupado/);
  assert.match(blocked, /netsh interface ipv4 show excludedportrange/);
  assert.doesNotMatch(blocked, /o el servidor no arranc/);

  const crashed = explainCrash("Error: Cannot find module 'next'\n");
  assert.match(crashed, /puerto estaba libre/);
  assert.match(crashed, /Cannot find module 'next'/);
  assert.match(explainInstall("npm ERR! network"), /npm no pudo instalar/);
});

test("a second launch cannot take the same lock", () => {
  const file = join(mkdtempSync(join(tmpdir(), "am-connect-")), "panel.lock");
  assert.equal(claimLock(file, { pid: 10, port: null }), true);
  assert.equal(claimLock(file, { pid: 11, port: null }), false);
  assert.deepEqual(readLock(file), { pid: 10, port: null });
  writeLock(file, { pid: 10, port: 3847 });
  assert.deepEqual(readLock(file), { pid: 10, port: 3847 });
  releaseLock(file, 11);
  assert.deepEqual(readLock(file), { pid: 10, port: 3847 });
  releaseLock(file, 10);
  assert.equal(readLock(file), null);
});

test("probe tells our panel, a busy port, and a free port apart", async () => {
  const ours = http.createServer((request, response) => {
    if (request.url === "/api/salud") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, app: APP_ID }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const ourPort = await listen(ours);
  assert.equal(await isOurPanel(ourPort), true);
  assert.equal(await probePort(ourPort), "ours");

  const stranger = net.createServer((socket) => socket.destroy());
  const strangerPort = await listen(stranger, 0, "0.0.0.0");
  assert.equal(await probePort(strangerPort), "busy");

  await close(ours);
  await close(stranger);
  assert.equal(await canListen(ourPort, "127.0.0.1") || (await canListen(ourPort)), true);
  assert.equal(panelUrl(ourPort), `http://127.0.0.1:${ourPort}`);
});

test("waits until the panel answers", async () => {
  const holder = net.createServer((socket) => socket.destroy());
  const port = await listen(holder);
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, app: APP_ID }));
  });
  const pending = waitForOurPanel(port, 3_000);
  setTimeout(() => {
    close(holder).then(() => listen(server, port));
  }, 300);
  assert.equal(await pending, true);
  await close(server);
  assert.equal(await waitForOurPanel(port, 600), false);
});
