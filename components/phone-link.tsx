"use client";

import { useEffect, useState } from "react";

async function copyUrl(url: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // On http://192.168… the browser often refuses the clipboard. The field below still copies.
  }
  try {
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

export function PhoneLink() {
  const [hosts, setHosts] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancel = false;
    void fetch("/api/salud")
      .then((response) => response.json())
      .then((data: { hosts?: unknown }) => {
        if (cancel || !Array.isArray(data.hosts)) return;
        setHosts(data.hosts.filter((host): host is string => typeof host === "string" && host.length > 0));
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  if (hosts.length === 0) return null;
  const url = `http://${hosts[0]}`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#d5e3f2] bg-[#e7eef6] px-4 py-2 text-sm text-slate-700">
      <p>
        En el teléfono, con el Wi‑Fi de este módem y sin datos, abre{" "}
        <a className="font-medium text-[#1578c9]" href={url}>
          {url}
        </a>
      </p>
      <button
        type="button"
        className="font-medium text-[#1578c9]"
        onClick={() => {
          void copyUrl(url).then((ok) => {
            if (!ok) return;
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
