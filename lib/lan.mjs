const VIRTUAL =
  /vethernet|hyper-v|wsl|docker|virtualbox|vmware|vbox|bluetooth|loopback|npcap|virbr|veth|br-/i;

export function isPrivateLan(address) {
  const parts = String(address).split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return a === 192 && b === 168;
}

export function lanHostsFrom(interfaces, port) {
  const physical = [];
  const fallback = [];
  for (const [name, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      const family = entry?.family;
      const v4 = family === "IPv4" || family === 4;
      if (!v4 || entry.internal) continue;
      if (!isPrivateLan(entry.address)) continue;
      const host = `${entry.address}:${port}`;
      if (VIRTUAL.test(name)) fallback.push(host);
      else physical.push(host);
    }
  }
  return [...new Set(physical.length > 0 ? physical : fallback)];
}
