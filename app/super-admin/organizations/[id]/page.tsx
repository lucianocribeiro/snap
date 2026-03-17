import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrganizationDetailClient } from "@/components/super-admin/OrganizationDetailClient";
import { I18nText } from "@/components/shared/I18nText";
import { getOrganizationById } from "@/lib/super-admin/data";

type OrganizationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = await params;
  const organization = await getOrganizationById(id);

  if (!organization) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title={<I18nText k="superAdmin.organizationDetail" />}
        action={
          <Link
            href="/super-admin/organizations"
            className="rounded-md border border-snap-border bg-transparent px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
          >
            <I18nText k="superAdmin.backToOrganizations" />
          </Link>
        }
      />
      <OrganizationDetailClient organization={organization} />
    </div>
  );
}
