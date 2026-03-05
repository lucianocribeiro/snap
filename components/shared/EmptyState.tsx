"use client";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-snap-border bg-snap-bg/50 p-8 text-center">
      <div className="h-14 w-14 rounded-full border border-snap-border bg-snap-surface" />
      <div className="max-w-md space-y-2">
        <p className="text-base font-medium text-snap-textMain">{title}</p>
        <p className="text-sm text-snap-textDim">{description}</p>
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-md border border-snap-border bg-snap-surface px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
