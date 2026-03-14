import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RecentOrganizationsTable } from "@/components/super-admin/RecentOrganizationsTable";
import { getPlatformSummary, getRecentOrganizations } from "@/lib/super-admin/data";

export default async function SuperAdminDashboardPage() {
  const [summary, recentOrganizations] = await Promise.all([
    getPlatformSummary(),
    getRecentOrganizations(10),
  ]);

  const cards = [
    { label: "Total organizations", value: summary.totalOrganizations },
    { label: "Total active users", value: summary.totalActiveUsers },
    { label: "Total invoices processed", value: summary.totalInvoicesProcessed },
    { label: "New organizations this month", value: summary.newOrganizationsThisMonth },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Platform-wide summary and recent organization activity."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-snap-border bg-snap-surface p-5">
            <p className="text-sm text-snap-textDim">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-snap-textMain">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-snap-textMain">Recent organizations</h2>
        {recentOrganizations.length === 0 ? (
          <EmptyState
            title="No organizations yet"
            description="Create your first organization to get started."
          />
        ) : (
          <RecentOrganizationsTable organizations={recentOrganizations} />
        )}
      </section>
    </div>
  );
}
