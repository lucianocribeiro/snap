import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { EditOrganizationForm } from "@/components/super-admin/EditOrganizationForm";
import { I18nText } from "@/components/shared/I18nText";
import { getOrganizationById } from "@/lib/super-admin/data";

type EditOrganizationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditOrganizationPage({ params }: EditOrganizationPageProps) {
  const { id } = await params;
  const organization = await getOrganizationById(id);

  if (!organization) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={<I18nText k="superAdmin.editOrganization" />}
        action={
          <Link
            href={`/super-admin/organizations/${organization.id}`}
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            <I18nText k="common.back" />
          </Link>
        }
      />
      <EditOrganizationForm organization={organization} />
    </div>
  );
}
