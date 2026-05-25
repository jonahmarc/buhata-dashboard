import { Link, redirect, useLoaderData, useRevalidator } from "react-router";
import { ArrowLeft, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getUpgrade,
  scopeUpgrade,
  logHours,
  completeUpgrade,
  type UpgradeRequest,
  type UpgradeStatus,
} from "~/services/upgrades";
import { getClient, type Client } from "~/services/clients";

interface LoaderData {
  upgrade: UpgradeRequest | null;
  client: Client | null;
  fetchError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { upgradeId: string };
}): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "admin") return redirect("/login");

  try {
    const upgrade = await getUpgrade(params.upgradeId);
    const clientResult = await getClient(upgrade.client_id).catch(() => null);
    return { upgrade, client: clientResult, fetchError: false };
  } catch {
    return { upgrade: null, client: null, fetchError: true };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const label = data?.upgrade
    ? `Upgrade #${data.upgrade.id.slice(0, 8)}`
    : "Upgrade Detail";
  return [{ title: `${label} — Buhata Admin` }];
}

const STATUS_VARIANT: Record<
  UpgradeStatus,
  "default" | "info" | "warning" | "success" | "danger"
> = {
  pending_scope: "warning",
  awaiting_approval: "info",
  approved: "info",
  rejected: "danger",
  completed: "success",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAmount(amount: string | null) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(amount));
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-cream/5 last:border-0">
      <span className="text-xs text-cream/40 shrink-0">{label}</span>
      <span className="text-sm text-cream text-right">{value}</span>
    </div>
  );
}

const COMPLEXITY_OPTIONS = [
  { value: "simple", label: "Simple (< 5 hrs)" },
  { value: "moderate", label: "Moderate (5–15 hrs)" },
  { value: "complex", label: "Complex (15–40 hrs)" },
  { value: "enterprise", label: "Enterprise (40+ hrs)" },
];

export default function AdminUpgradeDetailPage() {
  const { upgrade, client, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  // Scope form
  const [complexity, setComplexity] = useState(
    upgrade?.complexity_class ?? "simple"
  );
  const [estHours, setEstHours] = useState(
    upgrade?.estimated_hours ?? ""
  );
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  // Log hours form
  const [hoursInput, setHoursInput] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Complete
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  async function handleScope(e: React.FormEvent) {
    e.preventDefault();
    if (!upgrade || !estHours) return;
    setScopeLoading(true);
    setScopeError(null);
    try {
      await scopeUpgrade(upgrade.id, {
        complexity_class: complexity,
        estimated_hours: parseFloat(estHours),
      });
      revalidate();
    } catch {
      setScopeError("Could not save scope. Please try again.");
    } finally {
      setScopeLoading(false);
    }
  }

  async function handleLogHours(e: React.FormEvent) {
    e.preventDefault();
    if (!upgrade || !hoursInput) return;
    setLogLoading(true);
    setLogError(null);
    try {
      await logHours(upgrade.id, parseFloat(hoursInput));
      setHoursInput("");
      revalidate();
    } catch {
      setLogError("Could not log hours. Please try again.");
    } finally {
      setLogLoading(false);
    }
  }

  async function handleComplete() {
    if (!upgrade) return;
    setCompleteLoading(true);
    setCompleteError(null);
    try {
      await completeUpgrade(upgrade.id);
      revalidate();
    } catch {
      setCompleteError(
        "Could not complete upgrade. Ensure actual hours are logged first."
      );
    } finally {
      setCompleteLoading(false);
    }
  }

  const actualHours = parseFloat(upgrade?.actual_hours ?? "0");

  return (
    <div>
      <Topbar
        title={
          upgrade
            ? `Upgrade #${upgrade.id.slice(0, 8)}`
            : "Upgrade Detail"
        }
        subtitle={
          upgrade
            ? `${formatStatus(upgrade.status)} · ${client?.business_name ?? upgrade.client_id.slice(0, 8)}`
            : undefined
        }
        actions={
          <Link to="/admin/upgrades">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Upgrades
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Upgrade not found or you don't have access.
          </div>
        )}

        {upgrade && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left — upgrade info */}
            <div className="space-y-4">
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <h2 className="text-sm font-semibold text-cream uppercase tracking-wider">
                    Request Details
                  </h2>
                  <Badge
                    variant={STATUS_VARIANT[upgrade.status] ?? "default"}
                  >
                    {formatStatus(upgrade.status)}
                  </Badge>
                </div>

                <p className="text-sm text-cream/70 leading-relaxed mb-5 whitespace-pre-wrap">
                  {upgrade.description}
                </p>

                <div>
                  <DetailRow
                    label="Complexity"
                    value={
                      <span className="capitalize">
                        {upgrade.complexity_class ?? "—"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Estimated hours"
                    value={upgrade.estimated_hours ? `${upgrade.estimated_hours} hrs` : "—"}
                  />
                  <DetailRow
                    label="Estimated cost"
                    value={
                      <span className="font-medium">
                        {formatAmount(upgrade.estimated_cost)}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Actual hours logged"
                    value={
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-cream/40" />
                        {upgrade.actual_hours} hrs
                      </span>
                    }
                  />
                  {upgrade.invoice_id && (
                    <DetailRow
                      label="Invoice"
                      value={
                        <span className="font-mono text-xs text-amber/80">
                          {upgrade.invoice_id.slice(0, 12)}…
                        </span>
                      }
                    />
                  )}
                  {upgrade.ticket_id && (
                    <DetailRow
                      label="Linked ticket"
                      value={
                        <Link
                          to={`/admin/tickets/${upgrade.ticket_id}`}
                          className="font-mono text-xs text-amber/80 hover:text-amber"
                        >
                          {upgrade.ticket_id.slice(0, 8)}
                        </Link>
                      }
                    />
                  )}
                  <DetailRow
                    label="Submitted"
                    value={new Date(upgrade.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  />
                  {upgrade.client_approved_at && (
                    <DetailRow
                      label="Client approved"
                      value={new Date(
                        upgrade.client_approved_at
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    />
                  )}
                  {upgrade.completed_at && (
                    <DetailRow
                      label="Completed"
                      value={new Date(upgrade.completed_at).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Client info */}
              {client && (
                <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-cream uppercase tracking-wider">
                      Client
                    </h3>
                    <Link
                      to={`/admin/clients/${client.id}`}
                      className="text-xs text-amber/70 hover:text-amber transition-colors"
                    >
                      View profile →
                    </Link>
                  </div>
                  <DetailRow label="Business" value={client.business_name} />
                  {client.domain && (
                    <DetailRow label="Domain" value={client.domain} />
                  )}
                  <DetailRow label="Tier" value={`Tier ${client.tier}`} />
                </div>
              )}
            </div>

            {/* Right — actions */}
            <div className="space-y-4">
              {/* Scope form */}
              {(upgrade.status === "pending_scope" ||
                upgrade.status === "awaiting_approval") && (
                <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                  <h3 className="text-xs font-semibold text-cream uppercase tracking-wider mb-4">
                    {upgrade.status === "pending_scope"
                      ? "Set Scope"
                      : "Update Scope"}
                  </h3>
                  {upgrade.status === "awaiting_approval" && (
                    <p className="text-xs text-amber/70 mb-4">
                      Waiting for client approval. You can update the estimate below.
                    </p>
                  )}
                  <form onSubmit={handleScope} className="space-y-3">
                    <div>
                      <label className="block text-xs text-cream/50 mb-1">
                        Complexity class
                      </label>
                      <select
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value)}
                        className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
                      >
                        {COMPLEXITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-cream/50 mb-1">
                        Estimated hours
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={estHours}
                        onChange={(e) => setEstHours(e.target.value)}
                        placeholder="e.g. 8"
                        className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                      />
                      {estHours && (
                        <p className="mt-1 text-xs text-cream/40">
                          Estimated cost:{" "}
                          <span className="text-cream font-medium">
                            {formatAmount(
                              (parseFloat(estHours) * 10).toFixed(2)
                            )}
                          </span>{" "}
                          at $10/hr
                        </p>
                      )}
                    </div>
                    {scopeError && (
                      <p className="text-xs text-terracotta">{scopeError}</p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      loading={scopeLoading}
                      disabled={!estHours || parseFloat(estHours) <= 0}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      {upgrade.status === "pending_scope"
                        ? "Save Scope & Request Approval"
                        : "Update Scope"}
                    </Button>
                  </form>
                </div>
              )}

              {/* Log hours + Complete */}
              {upgrade.status === "approved" && (
                <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-cream uppercase tracking-wider mb-1">
                      Log Hours
                    </h3>
                    <p className="text-xs text-cream/40 mb-4">
                      Hours accumulate. Current:{" "}
                      <span className="text-cream font-medium">
                        {upgrade.actual_hours} hrs
                      </span>
                    </p>
                    <form onSubmit={handleLogHours} className="flex gap-2">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        placeholder="Add hours…"
                        className="h-9 flex-1 rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        loading={logLoading}
                        disabled={!hoursInput || parseFloat(hoursInput) <= 0}
                      >
                        Add
                      </Button>
                    </form>
                    {logError && (
                      <p className="mt-2 text-xs text-terracotta">{logError}</p>
                    )}
                  </div>

                  <div className="border-t border-cream/5 pt-4">
                    <p className="text-xs text-cream/40 mb-3">
                      Mark work as done and generate the upgrade invoice
                      ({upgrade.actual_hours} hrs ×{" "}
                      <span className="text-cream font-medium">$10</span> ={" "}
                      <span className="text-cream font-medium">
                        {formatAmount((actualHours * 10).toFixed(2))}
                      </span>
                      ).
                    </p>
                    {completeError && (
                      <p className="mb-2 text-xs text-terracotta">
                        {completeError}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      loading={completeLoading}
                      disabled={actualHours === 0}
                      onClick={handleComplete}
                    >
                      Complete & Generate Invoice
                    </Button>
                    {actualHours === 0 && (
                      <p className="mt-2 text-xs text-cream/30">
                        Log at least some hours before completing.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Rejected state */}
              {upgrade.status === "rejected" && (
                <div className="rounded-xl border border-terracotta/20 bg-terracotta/8 p-6">
                  <p className="text-sm font-semibold text-terracotta mb-1">
                    Client Rejected
                  </p>
                  <p className="text-xs text-terracotta/70">
                    The client rejected this upgrade request. No further action
                    is required.
                  </p>
                </div>
              )}

              {/* Completed state */}
              {upgrade.status === "completed" && (
                <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                  <p className="text-sm font-semibold text-cream mb-3">
                    Completed
                  </p>
                  <DetailRow
                    label="Final hours"
                    value={`${upgrade.actual_hours} hrs`}
                  />
                  <DetailRow
                    label="Final cost"
                    value={
                      <span className="font-medium">
                        {formatAmount(
                          (actualHours * 10).toFixed(2)
                        )}
                      </span>
                    }
                  />
                  {upgrade.invoice_id && (
                    <DetailRow
                      label="Invoice ID"
                      value={
                        <span className="font-mono text-xs text-cream/60">
                          {upgrade.invoice_id}
                        </span>
                      }
                    />
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
