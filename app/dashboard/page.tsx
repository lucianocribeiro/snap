"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Invoice, SummaryMetric } from "@/components/dashboard/types";
import { createClient } from "@/lib/supabase/client";

type RecentInvoiceRow = {
  id: string;
  invoice_number: string | null;
  vendor: string | null;
  total_amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  status: "paid" | "unpaid";
  project: { name: string } | { name: string }[] | null;
};

type MonthlyInvoiceRow = {
  invoice_date: string | null;
  total_amount: number | null;
};

type CategoryInvoiceRow = {
  category_id: string | null;
  total_amount: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInvoiceDate(date: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString();
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetric[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [periodSpend, setPeriodSpend] = useState<Array<{ label: string; value: number }>>([]);
  const [categorySpend, setCategorySpend] = useState<Array<{ label: string; value: number }>>([]);
  const [hasAnyInvoices, setHasAnyInvoices] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage(null);

      const now = new Date();
      const currentMonthStart = monthStart(now);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sixMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const currentMonthStartText = dateOnly(currentMonthStart);
      const nextMonthStartText = dateOnly(nextMonthStart);
      const sixMonthStartText = dateOnly(sixMonthStart);

      const summaryPromise = Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .gte("invoice_date", currentMonthStartText)
          .lt("invoice_date", nextMonthStartText),
        supabase
          .from("invoices")
          .select("total_amount")
          .gte("invoice_date", currentMonthStartText)
          .lt("invoice_date", nextMonthStartText),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("status", "unpaid"),
      ]);

      const detailsPromise = Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, vendor, total_amount, currency, invoice_date, status, project:projects(name)")
          .order("uploaded_at", { ascending: false })
          .limit(10),
        supabase
          .from("invoices")
          .select("invoice_date, total_amount")
          .gte("invoice_date", sixMonthStartText)
          .lt("invoice_date", nextMonthStartText),
        supabase.from("invoices").select("category_id, total_amount"),
        supabase.from("categories").select("id, name"),
      ]);

      const [
        [activeProjectsRes, monthInvoicesRes, monthAmountsRes, unpaidRes],
        [recentInvoicesRes, monthlyInvoicesRes, categoryInvoicesRes, categoriesRes],
      ] = await Promise.all([summaryPromise, detailsPromise]);

      const errors = [
        activeProjectsRes.error,
        monthInvoicesRes.error,
        monthAmountsRes.error,
        unpaidRes.error,
        recentInvoicesRes.error,
        monthlyInvoicesRes.error,
        categoryInvoicesRes.error,
        categoriesRes.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        setSummaryMetrics([
          { label: "Total projects", value: "0" },
          { label: "Total invoices (this month)", value: "0" },
          { label: "Total amount processed (this month)", value: formatCurrency(0) },
          { label: "Pending / unpaid invoices", value: "0" },
        ]);
        setRecentInvoices([]);
        setPeriodSpend([]);
        setCategorySpend([]);
        setHasAnyInvoices(false);
        setErrorMessage("Unable to load dashboard data right now.");
        setLoading(false);
        return;
      }

      const thisMonthAmount = ((monthAmountsRes.data ?? []) as Array<{ total_amount: number | null }>).reduce(
        (sum, row) => sum + (row.total_amount ?? 0),
        0,
      );

      setSummaryMetrics([
        { label: "Total projects", value: String(activeProjectsRes.count ?? 0) },
        { label: "Total invoices (this month)", value: String(monthInvoicesRes.count ?? 0) },
        {
          label: "Total amount processed (this month)",
          value: formatCurrency(thisMonthAmount),
          helperText: "Based on invoice totals",
        },
        { label: "Pending / unpaid invoices", value: String(unpaidRes.count ?? 0) },
      ]);

      const mappedInvoices = ((recentInvoicesRes.data ?? []) as RecentInvoiceRow[]).map((row) => {
        const relatedProject = Array.isArray(row.project) ? row.project[0] : row.project;
        return {
          id: row.id,
          invoiceNumber: row.invoice_number ?? "-",
          vendor: row.vendor ?? "-",
          project: relatedProject?.name ?? "-",
          amount: formatCurrency(row.total_amount ?? 0, row.currency ?? "USD"),
          currency: (row.currency ?? "USD").toUpperCase(),
          date: formatInvoiceDate(row.invoice_date),
          status: row.status === "paid" ? "Paid" : "Unpaid",
          notes: "",
        } satisfies Invoice;
      });

      setRecentInvoices(mappedInvoices);
      setHasAnyInvoices(mappedInvoices.length > 0);

      const monthKeys: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const point = new Date(sixMonthStart.getFullYear(), sixMonthStart.getMonth() + index, 1);
        monthKeys.push(`${point.getFullYear()}-${String(point.getMonth() + 1).padStart(2, "0")}`);
      }

      const spendByMonthMap = new Map<string, number>(monthKeys.map((key) => [key, 0]));
      ((monthlyInvoicesRes.data ?? []) as MonthlyInvoiceRow[]).forEach((row) => {
        if (!row.invoice_date) return;
        const parsed = new Date(row.invoice_date);
        if (Number.isNaN(parsed.getTime())) return;
        const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        if (!spendByMonthMap.has(key)) return;
        spendByMonthMap.set(key, (spendByMonthMap.get(key) ?? 0) + (row.total_amount ?? 0));
      });

      setPeriodSpend(
        monthKeys.map((key) => {
          const [year, month] = key.split("-");
          const date = new Date(Number(year), Number(month) - 1, 1);
          return {
            label: date.toLocaleDateString(undefined, { month: "short" }),
            value: spendByMonthMap.get(key) ?? 0,
          };
        }),
      );

      const categoryNameById = new Map(
        ((categoriesRes.data ?? []) as CategoryRow[]).map((category) => [category.id, category.name]),
      );
      const categoryTotals = new Map<string, number>();

      ((categoryInvoicesRes.data ?? []) as CategoryInvoiceRow[]).forEach((row) => {
        const label = row.category_id ? categoryNameById.get(row.category_id) ?? "Uncategorized" : "Uncategorized";
        categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + (row.total_amount ?? 0));
      });

      const sortedCategories = Array.from(categoryTotals.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value);

      const topCategories = sortedCategories.slice(0, 6);
      const otherValue = sortedCategories.slice(6).reduce((sum, item) => sum + item.value, 0);
      const finalCategories =
        otherValue > 0 ? [...topCategories, { label: "Other", value: otherValue }] : topCategories;

      setCategorySpend(finalCategories);
      setLoading(false);
    };

    void loadDashboard();
  }, [supabase]);

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {errorMessage ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
        <SummaryCards metrics={summaryMetrics} loading={loading} />
        <ChartsSection loading={loading} hasInvoices={hasAnyInvoices} spendByPeriod={periodSpend} spendByCategory={categorySpend} />
        <RecentInvoicesTable invoices={recentInvoices} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
