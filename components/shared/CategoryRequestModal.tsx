"use client";

import { FormEvent, useEffect, useState } from "react";

type CategoryRequestModalProps = {
  open: boolean;
  categoryName: string;
  onClose: () => void;
  onSubmit: (payload: { categoryName: string; note: string }) => Promise<void>;
};

export function CategoryRequestModal({
  open,
  categoryName,
  onClose,
  onSubmit,
}: CategoryRequestModalProps) {
  const [name, setName] = useState(categoryName);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(categoryName);
    setNote("");
    setError(null);
  }, [categoryName, open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ categoryName: normalizedName, note: note.trim() });
      setSubmitting(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to send request.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg space-y-5 rounded-xl border border-snap-border bg-snap-surface p-8 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-snap-textMain">Request Category</h3>
          <p className="text-sm text-snap-textDim">
            You have reached the 20-category limit for this project.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-snap-textDim">Category name *</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-snap-textDim">Optional note to admin</label>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-snap-border pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
