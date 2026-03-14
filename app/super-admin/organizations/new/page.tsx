import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { NewOrganizationForm } from "@/components/super-admin/NewOrganizationForm";

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="New Organization"
        action={
          <Link
            href="/super-admin/organizations"
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            Back
          </Link>
        }
      />
      <NewOrganizationForm />
    </div>
  );
}
