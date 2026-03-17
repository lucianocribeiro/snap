"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-snap-border bg-snap-surface p-8 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-snap-textMain">{title}</h3>
          <p className="text-sm text-snap-textDim">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-snap-border pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain transition hover:bg-snap-bg"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              "rounded-md px-4 py-2 text-sm font-medium transition",
              destructive
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-snap-card text-snap-textMain hover:bg-snap-bg",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
