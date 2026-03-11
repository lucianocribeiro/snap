export type SummaryMetric = {
  label: string;
  value: string;
  helperText?: string;
};

export type UserRole = "super_admin" | "org_admin" | "user";
export type PeriodType = "Weekly" | "Monthly" | "Custom";
export type ProjectStatus = "Active" | "Archived";

export type CustomPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type ProjectColumn =
  | "invoiceNumber"
  | "vendor"
  | "invoiceDate"
  | "dueDate"
  | "amount"
  | "tax"
  | "totalAmount"
  | "category"
  | "status"
  | "notes"
  | "custom1"
  | "custom2"
  | "custom3";

export type ProjectFormState = {
  name: string;
  description: string;
  periodType: PeriodType;
  customPeriods: CustomPeriod[];
  selectedColumns: ProjectColumn[];
  customColumnLabels: { custom1: string; custom2: string; custom3: string };
  categories: string[];
};

export type InvoiceStatus = "Paid" | "Unpaid";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  vendor: string;
  project: string;
  amount: string;
  currency: string;
  date: string;
  status: InvoiceStatus;
  notes: string;
};
