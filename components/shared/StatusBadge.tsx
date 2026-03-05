type StatusVariant = "invoice" | "user" | "org" | "project";

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
  },
  user: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactive: "border-snap-border bg-snap-bg text-snap-textDim",
  },
  org: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    inactive: "border-snap-border bg-snap-bg text-snap-textDim",
  },
  project: {
    active: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    archived: "border-snap-border bg-snap-bg text-snap-textDim",
  },
};

const fallbackClass = "border-snap-border bg-snap-bg text-snap-textDim";

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const normalizedStatus = status.trim().toLowerCase();
  const stateClass = stylesByVariant[variant][normalizedStatus] ?? fallbackClass;

  return <span className={`${baseClass} ${stateClass}`}>{status}</span>;
}

