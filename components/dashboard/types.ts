export type SummaryMetric = {
  label: string;
  value: string;
  helperText?: string;
};

export type InvoiceStatus = "Paid" | "Unpaid";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  vendor: string;
  project: string;
  amount: string;
  date: string;
  status: InvoiceStatus;
  notes: string;
};
