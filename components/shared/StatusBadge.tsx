type StatusVariant = "invoice" | "user" | "org" | "project" | "access" | "task";

type StatusBadgeProps = {
  status: string;
  variant: StatusVariant;
};

const baseClass =
  "inline-flex rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap";

const stylesByVariant: Record<StatusVariant, Record<string, string>> = {
  invoice: {
    paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    unpaid: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    pagada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    impaga: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  user: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactive: "border-snap-border bg-snap-bg text-snap-textDim",
    activo: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactivo: "border-snap-border bg-snap-bg text-snap-textDim",
  },
  org: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactive: "border-snap-border bg-snap-bg text-snap-textDim",
    activo: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactivo: "border-snap-border bg-snap-bg text-snap-textDim",
  },
  project: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    archived: "border-snap-border bg-snap-bg text-snap-textDim",
    activo: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    archivado: "border-snap-border bg-snap-bg text-snap-textDim",
  },
  access: {
    edit: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    "view only": "border-snap-border bg-snap-bg text-snap-textDim",
    // Spanish locale variants
    "edición": "border-blue-500/40 bg-blue-500/10 text-blue-300",
    "solo lectura": "border-snap-border bg-snap-bg text-snap-textDim",
  },
  task: {
    open: "border-snap-border bg-snap-bg text-snap-textDim",
    abierta: "border-snap-border bg-snap-bg text-snap-textDim",
    in_progress: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    "en progreso": "border-blue-500/40 bg-blue-500/10 text-blue-300",
    done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    completada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    "pending approval": "border-amber-400/40 bg-amber-400/10 text-yellow-400",
    "pendiente de aprobación": "border-amber-400/40 bg-amber-400/10 text-yellow-400",
  },
};

const fallbackClass = "border-snap-border bg-snap-bg text-snap-textDim";

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const normalizedStatus = status.trim().toLowerCase();
  const stateClass = stylesByVariant[variant][normalizedStatus] ?? fallbackClass;

  return <span className={`${baseClass} ${stateClass}`}>{status}</span>;
}
