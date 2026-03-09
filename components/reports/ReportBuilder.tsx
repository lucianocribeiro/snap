type ReportBuilderProps = {
  projectId: string;
};

export function ReportBuilder({ projectId }: ReportBuilderProps) {
  return (
    <section className="rounded-xl border border-snap-border bg-snap-surface p-6">
      <h3 className="text-lg font-semibold text-snap-textMain">Report Builder</h3>
      <p className="mt-2 text-sm text-snap-textDim">
        Reports for project <span className="font-medium text-snap-textMain">{projectId}</span> will be fully
        available in Phase 7.
      </p>
    </section>
  );
}
