type LanEntry = { family: string | number; internal: boolean; address: string };

export function isPrivateLan(address: string): boolean;

export function lanHostsFrom(
  interfaces: Record<string, readonly LanEntry[] | undefined> | undefined,
  port: string,
): string[];
