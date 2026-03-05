import { ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-snap-border bg-snap-surface p-8">
      <PageHeader title={title} description={description} />
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-8 border-t border-snap-border pt-6">{footer}</div> : null}
    </div>
  );
}
