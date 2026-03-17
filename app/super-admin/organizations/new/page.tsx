import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { I18nText } from "@/components/shared/I18nText";
import { NewOrganizationForm } from "@/components/super-admin/NewOrganizationForm";

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={<I18nText k="superAdmin.newOrganization" />}
        action={
          <Link
            href="/super-admin/organizations"
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            <I18nText k="common.back" />
          </Link>
        }
      />
      <NewOrganizationForm />
    </div>
  );
}
