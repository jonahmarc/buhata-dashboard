import { Link, useLoaderData, useRevalidator } from "react-router";
import { ArrowLeft, Globe, AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getClient, type Client } from "~/services/clients";
import {
  getBillingStatus,
  getInvoices,
  markInvoicePaid,
  startRecurring,
  reactivateClient,
  type BillingStatus,
  type Invoice,
} from "~/services/billing";

interface LoaderData {
  client: Client | null;
  invoices: Invoice[];
  billing: BillingStatus | null;
  fetchError: boolean;
  billingError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { clientId: string };
}): Promise<LoaderData> {
  try {
    const client = await getClient(params.clientId);
    const [invoicesResult, billingResult] = await Promise.allSettled([
      getInvoices(params.clientId),
      getBillingStatus(params.clientId),
    ]);
    return {
      client,
      invoices: invoicesResult.status === "fulfilled" ? invoicesResult.value : [],
      billing: billingResult.status === "fulfilled" ? billingResult.value : null,
      fetchError: false,
      billingError:
        invoicesResult.status === "rejected" ||
        billingResult.status === "rejected",
    };
  } catch {
    return {
      client: null,
      invoices: [],
      billing: null,
      fetchError: true,
      billingError: false,
    };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const name = data?.client?.business_name ?? "Client";
  return [{ title: `${name} — Buhata Admin` }];
}

function statusBadgeVariant(
  status: Client["status"]
): "success" | "info" | "warning" | "danger" | "default" {
  const map = { active: "success", deactivated: "danger", cancelled: "danger" } as const;
  return map[status] ?? "default";
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TIER_INFO: Record<number, string> = {
  1: "Tier 1 — Starter (5 updates/mo)",
  2: "Tier 2 — Basic (12 updates/mo)",
  3: "Tier 3 — Standard (22 updates/mo)",
  4: "Tier 4 — Pro (36 updates/mo)",
  5: "Tier 5 — Enterprise (80 dev hrs/mo)",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-cream/5 last:border-0">
      <span className="text-xs text-cream/40 shrink-0">{label}</span>
      <span className="text-sm text-cream text-right">{value}</span>
    </div>
  );
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const INVOICE_STATUS_VARIANT: Record<
  Invoice["status"],
  "default" | "success" | "warning" | "danger"
> = {
  paid: "success",
  pending: "warning",
  past_due: "danger",
  void: "default",
};

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClientDetailPage() {
  const { client, invoices, billing, fetchError, billingError } =
    useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  // Mark paid state
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [markLoading, setMarkLoading] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  // Start recurring state
  const [recurringDate, setRecurringDate] = useState(todayISO);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  // Reactivate state
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  function openMarkPaid(invoiceId: string) {
    setMarkingId(invoiceId);
    setPayRef("");
    setPayNotes("");
    setMarkError(null);
  }

  async function handleMarkPaid() {
    if (!markingId || !payRef.trim()) return;
    setMarkLoading(true);
    setMarkError(null);
    try {
      await markInvoicePaid(markingId, {
        payment_reference: payRef.trim(),
        payment_notes: payNotes.trim() || undefined,
      });
      setMarkingId(null);
      revalidate();
    } catch {
      setMarkError("Could not record payment. Check the reference and try again.");
    } finally {
      setMarkLoading(false);
    }
  }

  async function handleStartRecurring() {
    if (!client) return;
    setRecurringLoading(true);
    setRecurringError(null);
    try {
      await startRecurring(client.id, recurringDate);
      revalidate();
    } catch {
      setRecurringError("Could not generate invoice. Please try again.");
    } finally {
      setRecurringLoading(false);
    }
  }

  async function handleReactivate() {
    if (!client) return;
    setReactivateLoading(true);
    setReactivateError(null);
    try {
      await reactivateClient(client.id);
      revalidate();
    } catch {
      setReactivateError("Reactivation failed. Ensure all invoices are paid first.");
    } finally {
      setReactivateLoading(false);
    }
  }

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "pending" || inv.status === "past_due"
  );

  return (
    <div>
      <Topbar
        title={client?.business_name ?? "Client Detail"}
        subtitle={client?.domain ?? undefined}
        actions={
          <Link to="/admin/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Clients
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {client === null
              ? "Client not found or you don't have access."
              : "Could not reach the API."}
          </div>
        )}

        {client && (
          <div className="grid grid-cols-2 gap-4">
            {/* Summary card */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-cream">
                    {client.business_name}
                  </h2>
                  {client.domain && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-cream/40">
                      <Globe className="h-3.5 w-3.5" />
                      {client.domain}
                    </div>
                  )}
                </div>
                <Badge variant={statusBadgeVariant(client.status)}>
                  {formatStatus(client.status)}
                </Badge>
              </div>

              <div>
                <DetailRow label="Plan" value={TIER_INFO[client.tier]} />
                <DetailRow
                  label="Billing Cycle"
                  value={
                    <span className="capitalize">{client.billing_cycle}</span>
                  }
                />
                <DetailRow
                  label="Created"
                  value={new Date(client.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
                <DetailRow
                  label="User ID"
                  value={
                    <span className="font-mono text-xs text-cream/50">
                      {client.user_id}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Billing management card */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                  Billing
                </h2>
                {billing && (
                  <Badge
                    variant={
                      billing.status === "current"
                        ? "success"
                        : billing.status === "no_invoices"
                        ? "default"
                        : "danger"
                    }
                  >
                    {formatStatus(billing.status.replace(/_/g, " "))}
                  </Badge>
                )}
              </div>

              {billingError && (
                <div className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Could not load billing data.
                </div>
              )}

              {/* Reactivate — shown when client is deactivated */}
              {client.status === "deactivated" && (
                <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-terracotta mt-px" />
                    <div>
                      <p className="text-sm font-semibold text-terracotta">
                        Client is deactivated
                      </p>
                      <p className="mt-0.5 text-xs text-terracotta/70">
                        Mark all outstanding invoices as paid before reactivating.
                      </p>
                    </div>
                  </div>
                  {reactivateError && (
                    <p className="text-xs text-terracotta">{reactivateError}</p>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={reactivateLoading}
                    onClick={handleReactivate}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reactivate Client
                  </Button>
                </div>
              )}

              {/* Invoice list */}
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-lg border border-cream/5 bg-navy/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-cream">
                              {formatAmount(invoice.amount)}
                            </span>
                            <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                              {formatStatus(invoice.status)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-cream/40">
                            {formatInvoiceKind(invoice.kind)} · Due{" "}
                            {formatDate(invoice.due_date)}
                            {invoice.paid_at &&
                              ` · Paid ${formatDate(
                                invoice.paid_at.slice(0, 10)
                              )}`}
                          </p>
                          {invoice.payment_reference && (
                            <p className="mt-0.5 text-xs text-cream/30 font-mono">
                              Ref: {invoice.payment_reference}
                            </p>
                          )}
                        </div>
                        {(invoice.status === "pending" ||
                          invoice.status === "past_due") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openMarkPaid(invoice.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !billingError ? (
                /* No invoices — show start-recurring form */
                <div className="space-y-3">
                  <p className="text-xs text-cream/40">
                    No invoices yet. Generate the first recurring invoice once
                    onboarding is complete.
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-cream/50 mb-1">
                        Finalization date
                      </label>
                      <input
                        type="date"
                        value={recurringDate}
                        onChange={(e) => setRecurringDate(e.target.value)}
                        className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                      />
                    </div>
                    <Button
                      size="sm"
                      loading={recurringLoading}
                      onClick={handleStartRecurring}
                    >
                      Generate Invoice
                    </Button>
                  </div>
                  {recurringError && (
                    <p className="text-xs text-terracotta">{recurringError}</p>
                  )}
                </div>
              ) : null}

              {/* Mark Paid inline form */}
              {markingId && (
                <div className="rounded-lg border border-amber/20 bg-amber/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-cream">
                    Record PayPal Payment
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-cream/50 mb-1">
                        PayPal Transaction ID{" "}
                        <span className="text-terracotta">*</span>
                      </label>
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. 5YE80642TF6286924"
                        className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cream/50 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        rows={2}
                        placeholder="Any additional notes about this payment…"
                        className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors resize-none"
                      />
                    </div>
                  </div>
                  {markError && (
                    <p className="text-xs text-terracotta">{markError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={markLoading}
                      onClick={handleMarkPaid}
                      disabled={!payRef.trim()}
                    >
                      Confirm Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMarkingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!billingError && invoices.length === 0 && unpaidInvoices.length === 0 && (
                <p className="text-xs text-cream/25 text-center pt-2">
                  All invoices are settled.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
