"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = "host" | "viewer";
type Phase = "pick" | Role;

type Signal = {
  id: number;
  type: "offer" | "answer" | "ice" | "input" | "hangup";
  payload: unknown;
};

type InputEvent =
  | { kind: "move" | "click"; x: number; y: number }
  | { kind: "key"; key: string };

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export function Probar() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState("");
  const [hosts, setHosts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Elige de qué lado estás.");
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const afterRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const applyRef = useRef<(signal: Signal) => void>(() => undefined);
  const codeRef = useRef("");
  const lastMove = useRef(0);

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as {
      ok: boolean;
      error?: string;
      code?: string;
      hosts?: string[];
      signals?: Signal[];
    };
  }

  function cursorAt(input: InputEvent) {
    if (input.kind === "key") return;
    setCursor({ x: input.x * window.innerWidth, y: input.y * window.innerHeight });
  }

  function applyInput(input: InputEvent) {
    if (input.kind === "move") {
      cursorAt(input);
      return;
    }
    if (input.kind === "click") {
      cursorAt(input);
      const x = input.x * window.innerWidth;
      const y = input.y * window.innerHeight;
      const target = document.elementFromPoint(x, y);
      if (target instanceof HTMLElement) {
        target.focus();
        target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      }
      return;
    }
    if (input.kind !== "key") return;
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      writeKey(active, input.key);
    }
  }

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    applyRef.current = (signal) => {
      const pc = pcRef.current;
      if (signal.type === "hangup") {
        setError("La otra pantalla cerró la prueba.");
        void stop(false);
        return;
      }
      if (!pc) return;
      if (signal.type === "offer" || signal.type === "answer") {
        void pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit).then(async () => {
          for (const candidate of pendingIce.current) await pc.addIceCandidate(candidate);
          pendingIce.current = [];
          if (signal.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await post({ action: "push", code: codeRef.current, to: "host", type: "answer", payload: pc.localDescription });
          }
        });
        return;
      }
      if (signal.type === "ice") {
        const candidate = signal.payload as RTCIceCandidateInit | null;
        if (!candidate) return;
        if (!pc.remoteDescription) pendingIce.current.push(candidate);
        else void pc.addIceCandidate(candidate);
        return;
      }
      if (signal.type === "input") applyInput(signal.payload as InputEvent);
    };
  });

  useEffect(() => {
    if (phase === "pick" || !code) return;
    let cancel = false;
    async function pull() {
      const data = await post({ action: "pull", code, role: phase, after: afterRef.current });
      if (cancel || !data.ok) return;
      for (const signal of data.signals ?? []) {
        afterRef.current = signal.id;
        applyRef.current(signal);
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 400);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [phase, code]);

  async function stop(tell: boolean) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingIce.current = [];
    afterRef.current = 0;
    if (tell && code) await post({ action: "hangup", code });
    setCursor(null);
    setPhase("pick");
    setCode("");
    setStatus("La prueba terminó.");
  }

  async function startHost() {
    setError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Este navegador no puede compartir la pantalla.");
      return;
    }
    try {
      const created = await post({ action: "create" });
      if (!created.ok || !created.code) {
        setError(created.error ?? "No pude abrir la prueba.");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => void stop(true));
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void post({ action: "push", code: created.code, to: "viewer", type: "ice", payload: event.candidate.toJSON() });
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await post({ action: "push", code: created.code, to: "viewer", type: "offer", payload: pc.localDescription });
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("La tablet ya ve esta ventana.");
      };
      setHosts(created.hosts ?? []);
      setCode(created.code);
      setPhase("host");
      setStatus("En la tablet abre Vigía, entra a Probar y escribe este código.");
    } catch {
      setError("No se compartió la pantalla. Hay que aceptar el permiso del navegador.");
      pcRef.current?.close();
      pcRef.current = null;
    }
  }

  async function startViewer() {
    setError(null);
    const next = draft.trim();
    const joined = await post({ action: "join", code: next });
    if (!joined.ok) {
      setError(joined.error ?? "No pude entrar.");
      return;
    }
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0] ?? null;
        void videoRef.current.play().catch(() => undefined);
      }
      setStatus("Estás viendo la PC. El clic y el teclado van a esa ventana.");
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void post({ action: "push", code: next, to: "host", type: "ice", payload: event.candidate.toJSON() });
      }
    };
    afterRef.current = 0;
    setCode(next);
    setPhase("viewer");
    setStatus("Esperando la pantalla de la PC.");
  }

  function sendInput(input: InputEvent) {
    const current = codeRef.current;
    if (!current) return;
    if (input.kind === "move") {
      const now = Date.now();
      if (now - lastMove.current < 50) return;
      lastMove.current = now;
    }
    void post({ action: "push", code: current, to: "host", type: "input", payload: input });
  }

  function pointer(event: ReactPointerEvent<HTMLVideoElement>, kind: "move" | "click") {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    sendInput({
      kind,
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  }

  useEffect(() => {
    if (phase !== "viewer") return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      const current = codeRef.current;
      if (!current) return;
      void fetch("/api/salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push", code: current, to: "host", type: "input", payload: { kind: "key", key: event.key } }),
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <div>
      <div className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-xl font-medium text-slate-800">Probar con mi PC y mi tablet</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Las dos en la misma Wi‑Fi. La PC comparte la ventana de Vigía y la tablet la ve, hace clic y escribe ahí.
        </p>
      </div>

      {error ? <p className="mx-4 mt-4 rounded-md bg-alert/15 px-3 py-2 text-sm md:mx-6">{error}</p> : null}

      {phase === "pick" ? (
        <div className="grid gap-4 px-4 py-6 md:grid-cols-2 md:px-6">
          <section className="rounded-xl border border-border p-4">
            <h2 className="text-lg">Esta es la PC</h2>
            <p className="mt-1 text-sm text-slate-500">
              Comparte esta pestaña cuando el navegador lo pida. Anota el código y la dirección para la tablet.
            </p>
            <Button className="mt-4" onClick={() => void startHost()}>
              Compartir esta ventana
            </Button>
          </section>
          <section className="rounded-xl border border-border p-4">
            <h2 className="text-lg">Esta es la tablet</h2>
            <p className="mt-1 text-sm text-slate-500">Escribe el código de 6 números que muestra la PC.</p>
            <Input
              className="mt-4 max-w-48 tracking-[0.3em]"
              inputMode="numeric"
              maxLength={6}
              value={draft}
              aria-label="Código de la PC"
              placeholder="000000"
              onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <Button className="mt-3" disabled={draft.length !== 6} onClick={() => void startViewer()}>
              Conectar
            </Button>
          </section>
        </div>
      ) : null}

      {phase === "host" ? (
        <div className="px-4 py-6 md:px-6">
          <p className="text-sm text-slate-500">{status}</p>
          <p className="mt-3 text-5xl font-medium tracking-[0.25em] text-[#1578c9]">{code}</p>
          {hosts.length > 0 ? (
            <div className="mt-4 text-sm">
              <p className="text-slate-500">En la tablet abre una de estas direcciones:</p>
              <ul className="mt-2 space-y-1">
                {hosts.map((host) => (
                  <li key={host}>
                    <span className="font-medium text-slate-800">http://{host}/probar</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              En la tablet abre la misma dirección de esta PC, cambiando localhost por la IP de la computadora, y entra a
              Probar.
            </p>
          )}
          <Button className="mt-6" variant="outline" onClick={() => void stop(true)}>
            Cortar prueba
          </Button>
        </div>
      ) : null}

      {phase === "viewer" ? (
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{status}</p>
            <Button variant="outline" size="sm" onClick={() => void stop(true)}>
              Colgar
            </Button>
          </div>
          <video
            ref={videoRef}
            className="mt-3 aspect-video w-full rounded-xl bg-slate-950 object-contain"
            autoPlay
            playsInline
            muted
            onPointerMove={(event) => pointer(event, "move")}
            onPointerDown={(event) => pointer(event, "click")}
            aria-label="Pantalla de la PC"
          />
          <p className="mt-2 text-xs text-slate-500">Toca la imagen para el clic. Con el teclado de la tablet escribes donde esté el cursor en la PC.</p>
        </div>
      ) : null}

      {cursor && phase === "host" ? (
        <div
          className="pointer-events-none fixed z-[80] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1578c9] shadow"
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}
    </div>
  );
}

function writeKey(field: HTMLInputElement | HTMLTextAreaElement, key: string) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  if (key === "Backspace") {
    if (start === end && start > 0) field.setRangeText("", start - 1, end, "end");
    else field.setRangeText("", start, end, "end");
  } else if (key === "Delete") {
    if (start === end) field.setRangeText("", start, Math.min(field.value.length, end + 1), "end");
    else field.setRangeText("", start, end, "end");
  } else if (key === "Enter" && field instanceof HTMLTextAreaElement) {
    field.setRangeText("\n", start, end, "end");
  } else if (key.length === 1) {
    field.setRangeText(key, start, end, "end");
  } else {
    return;
  }
  field.dispatchEvent(new InputEvent("input", { bubbles: true }));
}
