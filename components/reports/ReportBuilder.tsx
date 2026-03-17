import { useLanguage } from "@/lib/i18n/LanguageContext";

type ReportBuilderProps = {
  projectId: string;
};

export function ReportBuilder({ projectId }: ReportBuilderProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
      <h3 className="text-lg font-semibold text-snap-textMain">{t("reports.builderTitle")}</h3>
      <p className="mt-2 text-sm text-snap-textDim">
        {t("reports.builderPrefix")} <span className="font-medium text-snap-textMain">{projectId}</span>{" "}
        {t("reports.builderSuffix")}
      </p>
    </section>
  );
}
