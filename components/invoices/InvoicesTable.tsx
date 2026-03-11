import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type InvoiceTableRow = {
  id: string;
  invoiceNumber: string;
  vendor: string;
  projectName?: string;
  categoryName?: string;
  invoiceDate: string | null;
  dueDate: string | null;
  amount: number | null;
  tax: number | null;
  totalAmount: number | null;
  currency: string;
  status: "Paid" | "Unpaid";
};

type InvoicesTableProps = {
  invoices: InvoiceTableRow[];
  canManage?: boolean;
  showProjectColumn?: boolean;
  onDelete?: (invoice: InvoiceTableRow) => void;
};

function formatAmountWithCurrency(value: number | null, currency: string) {
  if (typeof value !== "number") return "-";
  const numeric = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${numeric} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function InvoicesTable({
  invoices,
  canManage = false,
  showProjectColumn = true,
  onDelete,
}: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices found"
        description="Invoices matching your current filters will appear here."
      />
    );
  }

  const columns = [
    "Invoice #",
    "Vendor",
    ...(showProjectColumn ? ["Project"] : []),
    "Category",
    "Invoice Date",
    "Due Date",
    "Amount",
    "Tax",
    "Total",
    "Status",
    "Actions",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-snap-border bg-snap-surface">
      <table className="min-w-full divide-y divide-snap-border">
        <thead className="bg-snap-bg/80">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-snap-textDim"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-snap-border">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="px-4 py-4 text-sm font-medium text-snap-textMain">{invoice.invoiceNumber || "-"}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{invoice.vendor || "-"}</td>
              {showProjectColumn ? (
                <td className="px-4 py-4 text-sm text-snap-textDim">{invoice.projectName || "-"}</td>
              ) : null}
              <td className="px-4 py-4 text-sm text-snap-textDim">{invoice.categoryName || "-"}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{formatDate(invoice.invoiceDate)}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{formatDate(invoice.dueDate)}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{formatAmountWithCurrency(invoice.amount, invoice.currency)}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{formatAmountWithCurrency(invoice.tax, invoice.currency)}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">
                {formatAmountWithCurrency(invoice.totalAmount, invoice.currency)}
              </td>
              <td className="px-4 py-4 text-sm">
                <StatusBadge status={invoice.status} variant="invoice" />
              </td>
              <td className="px-4 py-4 text-sm text-snap-textDim">
                <div className="flex items-center gap-3">
                  <Link href={`/invoices/${invoice.id}`} className="hover:text-snap-textMain">
                    View
                  </Link>
                  <Link href={`/invoices/${invoice.id}`} className="hover:text-snap-textMain">
                    Edit
                  </Link>
                  {canManage && onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(invoice)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
