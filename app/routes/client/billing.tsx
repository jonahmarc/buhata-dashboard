import { redirect, useLoaderData } from "react-router";
import { AlertTriangle, CheckCircle, CalendarClock } from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getBillingStatus,
  getInvoices,
  type BillingStatus,
  type Invoice,
} from "~/services/billing";
import { cn } from "~/lib/utils";

interface LoaderData {
  billing: BillingStatus | null;
  invoices: Invoice[];
  billingError: boolean;
  invoicesError: boolean;
}

export async function clientLoader(): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  const clientId = auth.user?.client_id;
  if (!clientId) {
    return {
      billing: null,
      invoices: [],
      billingError: true,
      invoicesError: true,
    };
  }

  const [billing, invoices] = await Promise.allSettled([
    getBillingStatus(clientId),
    getInvoices(clientId),
  ]);

  return {
    billing: billing.status === "fulfilled" ? billing.value : null,
    invoices: invoices.status === "fulfilled" ? invoices.value : [],
    billingError: billing.status === "rejected",
    invoicesError: invoices.status === "rejected",
  };
}

export function meta() {
  return [{ title: "Billing — Buhata" }];
}

function formatAmount(amount: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(amount));
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatInvoiceKind(kind: Invoice["kind"]) {
  const labels: Record<Invoice["kind"], string> = {
    setup: "Setup Fee",
    monthly: "Monthly",
    annual: "Annual",
    late_fee: "Late Fee",
    upgrade_work: "Upgrade Work",
    overage: "Overage",
  };
  return labels[kind] ?? kind;
}

const INVOICE_STATUS_VARIANT: Record<
  Invoice["status"],
  "default" | "success" | "warning" | "danger" | "info"
> = {
  paid: "success",
  pending: "warning",
  past_due: "danger",
  void: "default",
};

function formatInvoiceStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ClientBillingPage() {
  const { billing, invoices, billingError, invoicesError } =
    useLoaderData() as LoaderData;

  const billingStatusConfig = billing
    ? {
        current: {
          label: "Current",
          icon: CheckCircle,
          iconClass: "text-emerald-400",
          bgClass: "bg-emerald-400/10",
          textClass: "text-emerald-400",
        },
        past_due: {
          label: "Past Due",
          icon: AlertTriangle,
          iconClass: "text-amber",
          bgClass: "bg-amber/10",
          textClass: "text-amber",
        },
        deactivation_pending: {
          label: "Action Required",
          icon: AlertTriangle,
          iconClass: "text-terracotta",
          bgClass: "bg-terracotta/10",
          textClass: "text-terracotta",
        },
        no_invoices: {
          label: "No Invoices",
          icon: CalendarClock,
          iconClass: "text-cream/40",
          bgClass: "bg-cream/5",
          textClass: "text-cream/60",
        },
      }[billing.status]
    : null;

  return (
    <div>
      <Topbar title="Billing" subtitle="Your invoices and payment status" />

      <div className="p-6 space-y-6">
        {(billingError || invoicesError) && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {billingError && invoicesError
              ? "Could not load billing information."
              : billingError
              ? "Could not load billing status."
              : "Could not load invoices."}
          </div>
        )}

        {/* Past-due banners */}
        {billing?.status === "past_due" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/8 px-5 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber mt-px" />
            <div>
              <p className="text-sm font-semibold text-amber">
                Payment overdue — {billing.days_past_due} day
                {billing.days_past_due !== 1 ? "s" : ""} past due
              </p>
              <p className="mt-0.5 text-xs text-amber/70">
                {billing.current_invoice &&
                  `${formatAmount(billing.current_invoice.amount)} was due on ${formatDate(billing.next_due_date)}.`}{" "}
                {parseFloat(billing.accrued_late_fees) > 0 &&
                  `Late fees of ${formatAmount(billing.accrued_late_fees)} have accrued.`}{" "}
                Please contact your account manager to settle the balance.
              </p>
            </div>
          </div>
        )}

        {billing?.status === "deactivation_pending" && (
          <div className="flex items-start gap-3 rounded-xl border border-terracotta/20 bg-terracotta/8 px-5 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-terracotta mt-px" />
            <div>
              <p className="text-sm font-semibold text-terracotta">
                Your site has been deactivated
              </p>
              <p className="mt-0.5 text-xs text-terracotta/70">
                Payment is more than 31 days overdue. Contact your account
                manager immediately to reactivate.
              </p>
            </div>
          </div>
        )}

        {/* Billing status summary */}
        {billing && billingStatusConfig && (
          <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                Account Standing
              </h2>
              <div className={cn("rounded-lg p-1.5", billingStatusConfig.bgClass)}>
                {(() => {
                  const Icon = billingStatusConfig.icon;
                  return (
                    <Icon
                      className={cn("h-4 w-4", billingStatusConfig.iconClass)}
                    />
                  );
                })()}
              </div>
            </div>

            <p
              className={cn(
                "text-base font-semibold",
                billingStatusConfig.textClass
              )}
            >
              {billingStatusConfig.label}
            </p>

            {billing.current_invoice && (
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream/40">Amount due</span>
                  <span className="font-medium text-cream">
                    {formatAmount(billing.current_invoice.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream/40">Due date</span>
                  <span
                    className={cn(
                      "font-medium",
                      billing.days_past_due > 0 ? "text-amber" : "text-cream"
                    )}
                  >
                    {formatDate(billing.next_due_date)}
                  </span>
                </div>
                {billing.days_past_due > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream/40">Days overdue</span>
                    <span className="font-medium text-terracotta">
                      {billing.days_past_due} day
                      {billing.days_past_due !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {parseFloat(billing.accrued_late_fees) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream/40">Accrued late fees</span>
                    <span className="font-medium text-terracotta">
                      {formatAmount(billing.accrued_late_fees)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {billing.status === "no_invoices" && (
              <p className="mt-2 text-sm text-cream/35 leading-relaxed">
                Your first invoice will appear here once billing starts.
              </p>
            )}
          </div>
        )}

        {/* Invoice history */}
        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-cream/5">
            <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
              Invoice History
            </h2>
          </div>

          {invoices.length === 0 ? (
            <div className="py-14 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">No invoices yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5 bg-cream/2">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden lg:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="transition-colors hover:bg-cream/3"
                  >
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-mono text-cream/50 truncate max-w-[12ch]">
                        #{invoice.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 hidden md:table-cell">
                      {formatInvoiceKind(invoice.kind)}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-cream">
                      {formatAmount(invoice.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 hidden lg:table-cell">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant={INVOICE_STATUS_VARIANT[invoice.status]}
                      >
                        {formatInvoiceStatus(invoice.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
