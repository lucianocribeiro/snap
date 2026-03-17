import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RecentOrganizationsTable } from "@/components/super-admin/RecentOrganizationsTable";
import { I18nText } from "@/components/shared/I18nText";
import { getPlatformSummary, getRecentOrganizations } from "@/lib/super-admin/data";

export default async function SuperAdminDashboardPage() {
  const [summary, recentOrganizations] = await Promise.all([
    getPlatformSummary(),
    getRecentOrganizations(10),
  ]);

  const cards = [
    { labelKey: "superAdmin.totalOrganizations", value: summary.totalOrganizations },
    { labelKey: "superAdmin.totalActiveUsers", value: summary.totalActiveUsers },
    { labelKey: "superAdmin.totalInvoicesProcessed", value: summary.totalInvoicesProcessed },
    { labelKey: "superAdmin.newOrganizationsThisMonth", value: summary.newOrganizationsThisMonth },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title={<I18nText k="nav.dashboard" />}
        description={<I18nText k="superAdmin.dashboardDescription" />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.labelKey} className="rounded-xl border border-snap-border bg-snap-surface p-5">
            <p className="text-sm text-snap-textDim"><I18nText k={card.labelKey} /></p>
            <p className="mt-2 text-3xl font-semibold text-snap-textMain">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-snap-textMain"><I18nText k="superAdmin.recentOrganizations" /></h2>
        {recentOrganizations.length === 0 ? (
          <EmptyState
            title={<I18nText k="superAdmin.noOrganizationsYet" />}
            description={<I18nText k="superAdmin.noOrganizationsYetDescription" />}
          />
        ) : (
          <RecentOrganizationsTable organizations={recentOrganizations} />
        )}
      </section>
    </div>
  );
}
