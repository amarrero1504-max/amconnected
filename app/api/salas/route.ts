import { closeRoom, createRoom, joinRoom, lanHosts, pullSignals, pushSignal, type Role, type Signal } from "@/lib/rooms";

const types = new Set<Signal["type"]>(["offer", "answer", "ice", "input", "hangup"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    code?: string;
    role?: Role;
    to?: Role;
    type?: Signal["type"];
    payload?: unknown;
    after?: number;
  } | null;

  if (!body?.action) return Response.json({ ok: false, error: "Falta la acción." }, { status: 400 });
  const now = Date.now();

  if (body.action === "create") {
    const host = request.headers.get("host") ?? "127.0.0.1:3847";
    const port = host.includes(":") ? host.split(":").pop() || "3847" : "3847";
    return Response.json({ ok: true, code: createRoom(now), hosts: lanHosts(port) });
  }

  const code = (body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return Response.json({ ok: false, error: "El código tiene 6 números." }, { status: 400 });

  if (body.action === "join") {
    const joined = joinRoom(code, now);
    return Response.json(joined, { status: joined.ok ? 200 : 404 });
  }

  if (body.action === "hangup") {
    closeRoom(code);
    return Response.json({ ok: true });
  }

  if (body.action === "push") {
    if (body.to !== "host" && body.to !== "viewer") {
      return Response.json({ ok: false, error: "Destino desconocido." }, { status: 400 });
    }
    if (!body.type || !types.has(body.type)) {
      return Response.json({ ok: false, error: "Tipo desconocido." }, { status: 400 });
    }
    const packed = JSON.stringify(body.payload ?? null);
    if (packed.length > 50000) return Response.json({ ok: false, error: "Ese dato es demasiado grande." }, { status: 400 });
    const pushed = pushSignal(code, body.to, body.type, body.payload ?? null, now);
    return Response.json(pushed, { status: pushed.ok ? 200 : 404 });
  }

  if (body.action === "pull") {
    if (body.role !== "host" && body.role !== "viewer") {
      return Response.json({ ok: false, error: "Falta el lado de la prueba." }, { status: 400 });
    }
    const pulled = pullSignals(code, body.role, Number(body.after) || 0, now);
    return Response.json(pulled, { status: pulled.ok ? 200 : 404 });
  }

  return Response.json({ ok: false, error: "Acción desconocida." }, { status: 400 });
}
