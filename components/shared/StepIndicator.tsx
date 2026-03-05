type StepIndicatorProps = {
  steps: string[];
  currentStep: number;
};

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="rounded-xl border border-snap-border bg-snap-surface p-6">
      <ol className="flex flex-col gap-4 md:flex-row md:items-start md:gap-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li key={step} className="flex flex-1 items-center gap-4 md:flex-col md:items-stretch md:gap-3">
              <div className="flex items-center gap-3 md:w-full md:justify-center">
                <span
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    isCompleted
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                      : isCurrent
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                        : "border-snap-border bg-snap-bg text-snap-textDim",
                  ].join(" ")}
                >
                  {isCompleted ? "✓" : stepNumber}
                </span>

                {index < steps.length - 1 ? (
                  <span
                    className={[
                      "hidden h-px w-12 md:block md:w-full",
                      isCompleted ? "bg-blue-500/40" : "bg-snap-border",
                    ].join(" ")}
                  />
                ) : null}
              </div>

              <p
                className={[
                  "text-sm md:text-center",
                  isCurrent ? "font-semibold text-snap-textMain" : "text-snap-textDim",
                ].join(" ")}
              >
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
