import { networkInterfaces } from "node:os";
import { lanHostsFrom } from "@/lib/lan.mjs";

export function GET(request: Request) {
  const host = request.headers.get("host") ?? "";
  const port = host.slice(host.lastIndexOf(":") + 1);
  const safePort = /^\d+$/.test(port) ? port : "3847";
  return Response.json({
    ok: true,
    app: "am-connect",
    hosts: lanHostsFrom(networkInterfaces(), safePort),
  });
}
