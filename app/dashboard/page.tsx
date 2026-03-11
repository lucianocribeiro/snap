import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Invoice, SummaryMetric } from "@/components/dashboard/types";

const summaryMetrics: SummaryMetric[] = [
  { label: "Total projects", value: "24", helperText: "Across all active organizations" },
  { label: "Total invoices (this month)", value: "182", helperText: "Processed in March" },
  { label: "Total amount processed (this month)", value: "$246,380.40", helperText: "USD equivalent total" },
  { label: "Pending / unpaid invoices", value: "37", helperText: "Awaiting payment confirmation" },
];

const recentInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2026-001",
    vendor: "Northwind Supply",
    project: "Acme Redesign",
    amount: "$4,500.00",
    currency: "USD",
    date: "2026-03-04",
    status: "Paid",
    notes: "Design sprint assets and UX workshop facilitation.",
  },
  {
    id: "2",
    invoiceNumber: "INV-2026-002",
    vendor: "Cloudline Hosting",
    project: "ERP Migration",
    amount: "$1,280.00",
    currency: "USD",
    date: "2026-03-03",
    status: "Unpaid",
    notes: "March infrastructure subscription.",
  },
  {
    id: "3",
    invoiceNumber: "INV-2026-003",
    vendor: "Bright Legal",
    project: "Compliance Rollout",
    amount: "$2,320.00",
    currency: "USD",
    date: "2026-03-02",
    status: "Paid",
    notes: "Contract review and policy update package.",
  },
  {
    id: "4",
    invoiceNumber: "INV-2026-004",
    vendor: "Data Forge",
    project: "Ops Hub",
    amount: "$3,760.00",
    currency: "USD",
    date: "2026-03-01",
    status: "Unpaid",
    notes: "ETL maintenance and incident support.",
  },
  {
    id: "5",
    invoiceNumber: "INV-2026-005",
    vendor: "Vertex Analytics",
    project: "BI Expansion",
    amount: "$6,150.00",
    currency: "USD",
    date: "2026-02-28",
    status: "Paid",
    notes: "Executive dashboard implementation phase 2.",
  },
  {
    id: "6",
    invoiceNumber: "INV-2026-006",
    vendor: "Blue Harbor",
    project: "Acme Redesign",
    amount: "$980.00",
    currency: "USD",
    date: "2026-02-28",
    status: "Paid",
    notes: "Stock imagery and branded iconography.",
  },
  {
    id: "7",
    invoiceNumber: "INV-2026-007",
    vendor: "Nexa Security",
    project: "Compliance Rollout",
    amount: "$5,920.00",
    currency: "USD",
    date: "2026-02-27",
    status: "Unpaid",
    notes: "Security audit and remediation report.",
  },
  {
    id: "8",
    invoiceNumber: "INV-2026-008",
    vendor: "Axiom Consulting",
    project: "ERP Migration",
    amount: "$7,430.00",
    currency: "USD",
    date: "2026-02-27",
    status: "Paid",
    notes: "Integration architecture planning sessions.",
  },
  {
    id: "9",
    invoiceNumber: "INV-2026-009",
    vendor: "Printo Studio",
    project: "Marketing Ops",
    amount: "$640.00",
    currency: "USD",
    date: "2026-02-26",
    status: "Unpaid",
    notes: "Campaign print and promotional materials.",
  },
  {
    id: "10",
    invoiceNumber: "INV-2026-010",
    vendor: "Pulse Training",
    project: "Ops Hub",
    amount: "$2,140.00",
    currency: "USD",
    date: "2026-02-25",
    status: "Paid",
    notes: "Internal onboarding and financial tool training.",
  },
];

export default function DashboardPage() {
  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <SummaryCards metrics={summaryMetrics} />
        <ChartsSection />
        <RecentInvoicesTable invoices={recentInvoices} />
      </div>
    </DashboardLayout>
  );
}
