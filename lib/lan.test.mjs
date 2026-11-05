import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateLan, lanHostsFrom } from "./lan.mjs";

test("keeps home and office addresses and drops the rest", () => {
  assert.equal(isPrivateLan("192.168.1.27"), true);
  assert.equal(isPrivateLan("10.8.0.4"), true);
  assert.equal(isPrivateLan("172.16.0.2"), true);
  assert.equal(isPrivateLan("172.32.0.2"), false);
  assert.equal(isPrivateLan("169.254.1.1"), false);
  assert.equal(isPrivateLan("100.64.0.1"), false);
  assert.equal(isPrivateLan("8.8.8.8"), false);
});

test("shows the ethernet address and hides virtual adapters", () => {
  const hosts = lanHostsFrom(
    {
      Ethernet: [{ family: "IPv4", internal: false, address: "192.168.1.27" }],
      "vEthernet (WSL)": [{ family: "IPv4", internal: false, address: "172.22.160.1" }],
      "Loopback Pseudo-Interface 1": [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
    },
    "3847",
  );
  assert.deepEqual(hosts, ["192.168.1.27:3847"]);
});

test("falls back to a virtual adapter when it is the only address", () => {
  const hosts = lanHostsFrom(
    {
      "vEthernet (Default Switch)": [{ family: "IPv4", internal: false, address: "172.18.0.1" }],
    },
    "3848",
  );
  assert.deepEqual(hosts, ["172.18.0.1:3848"]);
});
