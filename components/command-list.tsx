import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { COMMAND_STATUS_LABEL, KIND_NOUN } from "@/lib/labels";
import type { Command, CommandStatus } from "@/lib/types";

function badgeVariant(status: CommandStatus) {
  if (status === "queued") return "outline" as const;
  if (status === "running") return "secondary" as const;
  if (status === "failed") return "destructive" as const;
  return "default" as const;
}

export function CommandList({
  commands,
  names,
  now,
  empty,
}: {
  commands: Command[];
  names?: Map<string, string>;
  now: number;
  empty: string;
}) {
  if (commands.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul>
      {commands.map((command) => {
        const machine = names?.get(command.machineId);
        return (
          <li key={command.id} className="border-b border-border/80 py-3 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">
                {KIND_NOUN[command.kind]}
                {machine ? <span className="font-normal text-muted-foreground"> · {machine}</span> : null}
              </p>
              <Badge variant={badgeVariant(command.status)}>{COMMAND_STATUS_LABEL[command.status]}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {command.actor} · {formatRelative(command.createdAt, now)}
            </p>
            {command.kind === "message" && command.message ? (
              <p className="mt-1 text-sm">«{command.message}»</p>
            ) : null}
            {command.result ? <p className="mt-1 text-sm text-muted-foreground">{command.result}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
