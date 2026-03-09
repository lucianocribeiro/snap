import type { ProjectColumn } from "@/components/dashboard/types";

export const PROJECT_STEPS = ["Basic Info", "Period", "Columns", "Categories", "Review"];

export const PROJECT_COLUMN_LABELS: Record<ProjectColumn, string> = {
  invoiceNumber: "Invoice #",
  vendor: "Vendor / Supplier",
  invoiceDate: "Invoice Date",
  dueDate: "Due Date",
  amount: "Amount (excl. tax)",
  tax: "Tax",
  totalAmount: "Total Amount",
  category: "Category",
  status: "Status",
  notes: "Notes",
  custom1: "Custom 1",
  custom2: "Custom 2",
  custom3: "Custom 3",
};

export const DEFAULT_SELECTED_COLUMNS: ProjectColumn[] = [
  "invoiceNumber",
  "vendor",
  "invoiceDate",
  "totalAmount",
  "category",
  "status",
];

export const PERIOD_OPTIONS = ["Weekly", "Monthly", "Custom"] as const;
