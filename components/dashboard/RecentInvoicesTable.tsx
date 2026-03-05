import { Invoice } from "./types";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

type RecentInvoicesTableProps = {
  invoices: Invoice[];
};

export function RecentInvoicesTable({ invoices }: RecentInvoicesTableProps) {
  return (
    <section className="space-y-6 rounded-2xl border border-snap-border bg-snap-surface p-8">
      <header className="flex flex-col gap-4 border-b border-snap-border pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-snap-textMain">Recent Invoices</h2>
          <p className="text-sm text-snap-textDim">Last 10 uploaded invoices</p>
        </div>

        <label className="flex items-center gap-3 text-sm text-snap-textDim">
          <span>Period</span>
          <select className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none">
            <option>Week</option>
            <option>Month</option>
            <option>Custom date range</option>
          </select>
        </label>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Invoices matching this period will appear here once uploaded."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-snap-border">
          <table className="min-w-full divide-y divide-snap-border">
            <thead className="bg-snap-bg/80">
              <tr>
                {[
                  "Invoice #",
                  "Vendor",
                  "Project",
                  "Amount",
                  "Date",
                  "Status",
                  "Notes",
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-snap-textDim"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-snap-border bg-snap-surface">
              {invoices.slice(0, 10).map((invoice) => (
                <tr key={invoice.id} className="align-top">
                  <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-snap-textMain">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm text-snap-textMain">
                    {invoice.vendor}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm text-snap-textDim">
                    {invoice.project}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-snap-textMain">
                    {invoice.amount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm text-snap-textDim">
                    {invoice.date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm">
                    <StatusBadge status={invoice.status} variant="invoice" />
                  </td>
                  <td className="min-w-[220px] px-6 py-5 text-sm text-snap-textDim">
                    {invoice.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
