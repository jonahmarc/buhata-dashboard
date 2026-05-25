import { Link, useLoaderData, useRevalidator } from "react-router";
import {
  ArrowLeft,
  Globe,
  AlertTriangle,
  RotateCcw,
  Pencil,
  X,
  CheckCircle,
  Circle,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getClient,
  updateClient,
  type Client,
} from "~/services/clients";
import {
  getBillingStatus,
  getInvoices,
  markInvoicePaid,
  reactivateClient,
  type BillingStatus,
  type Invoice,
} from "~/services/billing";
import {
  getTickets,
  acknowledgeTicket,
  startTicket,
  resolveTicket,
  closeTicket,
  type Ticket as TicketItem,
} from "~/services/tickets";
import {
  getOnboardingState,
  finalizeOnboarding,
  startBuild,
  goLive,
  type OnboardingState,
  type Asset,
} from "~/services/onboarding";

interface LoaderData {
  client: Client | null;
  invoices: Invoice[];
  billing: BillingStatus | null;
  tickets: TicketItem[];
  onboarding: OnboardingState | null;
  fetchError: boolean;
  billingError: boolean;
  ticketsError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { clientId: string };
}): Promise<LoaderData> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "admin") {
    return {
      client: null,
      invoices: [],
      billing: null,
      tickets: [],
      onboarding: null,
      fetchError: true,
      billingError: false,
      ticketsError: false,
    };
  }

  try {
    const client = await getClient(params.clientId);
    const [invoicesR, billingR, ticketsR, onboardingR] =
      await Promise.allSettled([
        getInvoices(params.clientId),
        getBillingStatus(params.clientId),
        getTickets({ client_id: params.clientId, page_size: 20 }),
        getOnboardingState(params.clientId),
      ]);
    return {
      client,
      invoices: invoicesR.status === "fulfilled" ? invoicesR.value : [],
      billing: billingR.status === "fulfilled" ? billingR.value : null,
      tickets:
        ticketsR.status === "fulfilled" ? ticketsR.value.items : [],
      onboarding:
        onboardingR.status === "fulfilled" ? onboardingR.value : null,
      fetchError: false,
      billingError:
        invoicesR.status === "rejected" || billingR.status === "rejected",
      ticketsError: ticketsR.status === "rejected",
    };
  } catch {
    return {
      client: null,
      invoices: [],
      billing: null,
      tickets: [],
      onboarding: null,
      fetchError: true,
      billingError: false,
      ticketsError: false,
    };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const name = data?.client?.business_name ?? "Client";
  return [{ title: `${name} — Buhata Admin` }];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadgeVariant(
  status: Client["status"]
): "success" | "info" | "warning" | "danger" | "default" {
  const map = {
    active: "success",
    deactivated: "danger",
    cancelled: "danger",
    onboarding: "info",
  } as const;
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

const TICKET_TYPE_LABELS: Record<string, string> = {
  content_update: "Content Update",
  upgrade_request: "Upgrade Request",
  support: "Support",
  billing: "Billing",
};

const TICKET_STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  open: "default",
  acknowledged: "info",
  in_progress: "info",
  resolved: "success",
  closed: "default",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  project_brief: "Project Brief",
  logo: "Logo",
  brand_guidelines: "Brand Guidelines",
  content: "Website Content",
  fonts: "Fonts",
  other: "Other",
};

// ── Edit Modal (F4) ────────────────────────────────────────────────────────────

function EditModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tier, setTier] = useState<number>(client.tier);
  const [cycle, setCycle] = useState(client.billing_cycle);
  const [domain, setDomain] = useState(client.domain ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateClient(client.id, {
        tier: tier as Client["tier"],
        billing_cycle: cycle,
        domain: domain.trim() || undefined,
      });
      onSaved();
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-cream/10 bg-dark-deep p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-cream">
            Edit {client.business_name}
          </h2>
          <button
            onClick={onClose}
            className="text-cream/40 hover:text-cream transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-cream/50 mb-1">Plan / Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(parseInt(e.target.value))}
              className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>
                  {TIER_INFO[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-cream/50 mb-1">
              Billing Cycle
            </label>
            <select
              value={cycle}
              onChange={(e) =>
                setCycle(e.target.value as Client["billing_cycle"])
              }
              className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-cream/50 mb-1">
              Domain{" "}
              <span className="text-cream/30">(optional)</span>
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. mybusiness.com"
              className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-terracotta">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Onboarding step indicator ──────────────────────────────────────────────────

function OnboardingStep({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-cream/20 shrink-0" />
      )}
      <span className={`text-xs ${done ? "text-cream" : "text-cream/35"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { client, invoices, billing, tickets, onboarding, fetchError, billingError, ticketsError } =
    useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  // F4 Edit modal
  const [editOpen, setEditOpen] = useState(false);

  // Mark paid state
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [markLoading, setMarkLoading] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  // Reactivate state
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  // F2 Ticket actions
  const [ticketProcessing, setTicketProcessing] = useState<string | null>(null);
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);

  // F6 Onboarding actions
  const [onboardingAction, setOnboardingAction] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

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

  async function handleReactivate() {
    if (!client) return;
    setReactivateLoading(true);
    setReactivateError(null);
    try {
      await reactivateClient(client.id);
      revalidate();
    } catch {
      setReactivateError(
        "Reactivation failed. Ensure all invoices are paid first."
      );
    } finally {
      setReactivateLoading(false);
    }
  }

  async function runTicketAction(
    id: string,
    fn: (id: string) => Promise<TicketItem>
  ) {
    setTicketProcessing(id);
    setTicketActionError(null);
    try {
      await fn(id);
      revalidate();
    } catch {
      setTicketActionError("Action failed. Please try again.");
    } finally {
      setTicketProcessing(null);
    }
  }

  async function runOnboardingAction(
    action: string,
    fn: (id: string) => Promise<Client>
  ) {
    if (!client) return;
    setOnboardingAction(action);
    setOnboardingError(null);
    try {
      await fn(client.id);
      revalidate();
    } catch {
      setOnboardingError(`Could not ${action.replace("-", " ")}. Please try again.`);
    } finally {
      setOnboardingAction(null);
    }
  }

  return (
    <div>
      {editOpen && client && (
        <EditModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            revalidate();
          }}
        />
      )}

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
            {/* ── LEFT COLUMN: info + billing ── */}
            <div className="space-y-4">
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
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant(client.status)}>
                      {formatStatus(client.status)}
                    </Badge>
                    <button
                      onClick={() => setEditOpen(true)}
                      className="flex items-center gap-1 rounded-lg border border-cream/10 bg-cream/3 px-2.5 py-1.5 text-xs text-cream/50 hover:text-cream hover:border-cream/20 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
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
                    value={new Date(client.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
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

              {/* Billing card */}
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

                {/* Reactivate */}
                {client.status === "deactivated" && (
                  <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-terracotta mt-px" />
                      <div>
                        <p className="text-sm font-semibold text-terracotta">
                          Client is deactivated
                        </p>
                        <p className="mt-0.5 text-xs text-terracotta/70">
                          Mark all outstanding invoices as paid before
                          reactivating.
                        </p>
                      </div>
                    </div>
                    {reactivateError && (
                      <p className="text-xs text-terracotta">
                        {reactivateError}
                      </p>
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
                              <Badge
                                variant={
                                  INVOICE_STATUS_VARIANT[invoice.status]
                                }
                              >
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
                  <p className="text-xs text-cream/40">
                    No invoices yet. Finalize onboarding (below) to generate
                    the first recurring invoice.
                  </p>
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
              </div>
            </div>

            {/* ── RIGHT COLUMN: tickets + onboarding ── */}
            <div className="space-y-4">
              {/* F2 Tickets section */}
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-cream/40" />
                    <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                      Tickets
                    </h2>
                    <span className="text-xs text-cream/30">
                      ({tickets.length})
                    </span>
                  </div>
                  <Link
                    to={`/admin/tickets?client_id=${client.id}`}
                    className="text-xs text-amber/70 hover:text-amber transition-colors"
                  >
                    All tickets →
                  </Link>
                </div>

                {ticketsError && (
                  <div className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Could not load tickets.
                  </div>
                )}

                {ticketActionError && (
                  <div className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {ticketActionError}
                  </div>
                )}

                {tickets.length === 0 ? (
                  <p className="text-sm text-cream/30 py-4 text-center">
                    No tickets from this client.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-lg border border-cream/5 bg-navy/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={`/admin/tickets/${ticket.id}`}
                              className="text-sm font-medium text-cream hover:text-amber transition-colors"
                            >
                              {ticket.subject}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  TICKET_STATUS_VARIANT[ticket.status] ??
                                  "default"
                                }
                              >
                                {formatStatus(ticket.status)}
                              </Badge>
                              <span className="text-xs text-cream/30">
                                {TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {ticket.status === "open" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={ticketProcessing === ticket.id}
                                onClick={() =>
                                  runTicketAction(
                                    ticket.id,
                                    acknowledgeTicket
                                  )
                                }
                              >
                                Ack
                              </Button>
                            )}
                            {ticket.status === "acknowledged" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={ticketProcessing === ticket.id}
                                onClick={() =>
                                  runTicketAction(ticket.id, startTicket)
                                }
                              >
                                Start
                              </Button>
                            )}
                            {ticket.status === "in_progress" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={ticketProcessing === ticket.id}
                                onClick={() =>
                                  runTicketAction(ticket.id, resolveTicket)
                                }
                              >
                                Resolve
                              </Button>
                            )}
                            {ticket.status === "resolved" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={ticketProcessing === ticket.id}
                                onClick={() =>
                                  runTicketAction(ticket.id, closeTicket)
                                }
                              >
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* F6 Onboarding section */}
              {onboarding && (
                <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-5">
                  <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                    Onboarding
                  </h2>

                  {onboardingError && (
                    <div className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {onboardingError}
                    </div>
                  )}

                  {/* Progress */}
                  <div className="space-y-2.5">
                    <OnboardingStep
                      label="Onboarding finalized (billing started)"
                      done={onboarding.is_finalized}
                    />
                    <OnboardingStep
                      label="Build clock started"
                      done={onboarding.is_build_started}
                    />
                    <OnboardingStep
                      label="Client live (status → active)"
                      done={onboarding.is_live}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!onboarding.is_finalized && (
                      <Button
                        size="sm"
                        loading={onboardingAction === "finalize"}
                        onClick={() =>
                          runOnboardingAction("finalize", finalizeOnboarding)
                        }
                      >
                        Finalize & Generate Invoice
                      </Button>
                    )}
                    {onboarding.is_finalized && !onboarding.is_build_started && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={onboardingAction === "start-build"}
                        onClick={() =>
                          runOnboardingAction("start-build", startBuild)
                        }
                      >
                        Start Build Clock
                      </Button>
                    )}
                    {onboarding.is_finalized && !onboarding.is_live && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={onboardingAction === "go-live"}
                        onClick={() =>
                          runOnboardingAction("go-live", goLive)
                        }
                      >
                        Go Live
                      </Button>
                    )}
                    {onboarding.is_live && (
                      <p className="text-xs text-emerald-400">
                        Client is live ✓
                      </p>
                    )}
                  </div>

                  {/* Build clock elapsed */}
                  {onboarding.is_build_started &&
                    onboarding.build_clock_elapsed_hours !== null && (
                      <p className="text-xs text-cream/40">
                        Build elapsed:{" "}
                        <span className="text-cream">
                          {Math.floor(onboarding.build_clock_elapsed_hours)}h{" "}
                          {Math.round(
                            (onboarding.build_clock_elapsed_hours -
                              Math.floor(
                                onboarding.build_clock_elapsed_hours
                              )) *
                              60
                          )}
                          m
                        </span>
                      </p>
                    )}

                  {/* Asset checklist */}
                  {onboarding.assets.length > 0 && (
                    <div className="border-t border-cream/5 pt-4">
                      <p className="text-xs font-medium text-cream/50 mb-3">
                        Submitted assets ({onboarding.assets.length})
                      </p>
                      <div className="space-y-2">
                        {onboarding.assets.map((asset: Asset) => {
                          const label =
                            ASSET_TYPE_LABELS[asset.asset_type] ??
                            asset.asset_type;
                          const isUrl =
                            asset.url && asset.url.startsWith("http");
                          return (
                            <div
                              key={asset.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span className="text-cream/60 font-medium">
                                {label}
                              </span>
                              {isUrl ? (
                                <a
                                  href={asset.url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber/60 hover:text-amber truncate"
                                >
                                  {asset.url}
                                </a>
                              ) : (
                                <span className="text-cream/30 truncate">
                                  {asset.filename ?? asset.url ?? "—"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
