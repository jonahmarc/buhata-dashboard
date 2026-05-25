import { Link, redirect, useLoaderData, useRevalidator } from "react-router";
import { ArrowLeft, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getUpgrade,
  approveUpgrade,
  rejectUpgrade,
  type UpgradeRequest,
  type UpgradeStatus,
} from "~/services/upgrades";

interface LoaderData {
  upgrade: UpgradeRequest | null;
  fetchError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { upgradeId: string };
}): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  try {
    const upgrade = await getUpgrade(params.upgradeId);
    return { upgrade, fetchError: false };
  } catch {
    return { upgrade: null, fetchError: true };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const label = data?.upgrade
    ? `Upgrade #${data.upgrade.id.slice(0, 8)}`
    : "Upgrade Detail";
  return [{ title: `${label} — Buhata` }];
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

export default function ClientUpgradeDetailPage() {
  const { upgrade, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove() {
    if (!upgrade) return;
    setApproveLoading(true);
    setActionError(null);
    try {
      await approveUpgrade(upgrade.id);
      revalidate();
    } catch {
      setActionError("Could not approve. Please try again.");
    } finally {
      setApproveLoading(false);
    }
  }

  async function handleReject() {
    if (!upgrade) return;
    setRejectLoading(true);
    setActionError(null);
    try {
      await rejectUpgrade(upgrade.id);
      revalidate();
    } catch {
      setActionError("Could not reject. Please try again.");
    } finally {
      setRejectLoading(false);
    }
  }

  return (
    <div>
      <Topbar
        title={
          upgrade
            ? `Upgrade #${upgrade.id.slice(0, 8)}`
            : "Upgrade Detail"
        }
        subtitle={upgrade ? formatStatus(upgrade.status) : undefined}
        actions={
          <Link to="/client/upgrades">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              My Upgrades
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
          <div className="max-w-2xl space-y-4">
            {/* Main info card */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-cream uppercase tracking-wider">
                  Request Details
                </h2>
                <Badge variant={STATUS_VARIANT[upgrade.status] ?? "default"}>
                  {formatStatus(upgrade.status)}
                </Badge>
              </div>

              <p className="text-sm text-cream/70 leading-relaxed mb-5 whitespace-pre-wrap">
                {upgrade.description}
              </p>

              <div>
                {upgrade.complexity_class && (
                  <DetailRow
                    label="Complexity"
                    value={
                      <span className="capitalize">{upgrade.complexity_class}</span>
                    }
                  />
                )}
                {upgrade.estimated_hours && (
                  <DetailRow
                    label="Estimated hours"
                    value={`${upgrade.estimated_hours} hrs`}
                  />
                )}
                <DetailRow
                  label="Estimated cost"
                  value={
                    <span className="font-medium">
                      {formatAmount(upgrade.estimated_cost)}
                    </span>
                  }
                />
                <DetailRow
                  label="Submitted"
                  value={new Date(upgrade.created_at).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                />
                {upgrade.client_approved_at && (
                  <DetailRow
                    label="You approved"
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
                    value={
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        {new Date(upgrade.completed_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    }
                  />
                )}
              </div>
            </div>

            {/* Approval card — awaiting_approval only */}
            {upgrade.status === "awaiting_approval" && (
              <div className="rounded-xl border border-amber/20 bg-amber/5 p-6">
                <h3 className="text-sm font-semibold text-amber mb-2">
                  Your Approval Needed
                </h3>
                <p className="text-xs text-amber/70 mb-4 leading-relaxed">
                  Our team has scoped this work. Review the estimate above and
                  approve to proceed, or reject if you'd like to revisit.
                </p>

                {actionError && (
                  <p className="mb-3 text-xs text-terracotta">{actionError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={approveLoading}
                    onClick={handleApprove}
                  >
                    Approve — {formatAmount(upgrade.estimated_cost)}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={rejectLoading}
                    onClick={handleReject}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Status context cards */}
            {upgrade.status === "pending_scope" && (
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
                <p className="text-sm text-cream/50">
                  Our team is reviewing your request and will provide a scope
                  estimate soon.
                </p>
              </div>
            )}

            {upgrade.status === "approved" && (
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
                <p className="text-sm text-cream/50">
                  Your request is approved and work is in progress.
                </p>
              </div>
            )}

            {upgrade.status === "rejected" && (
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
                <p className="text-sm text-cream/50">
                  You rejected this upgrade request. Contact your account
                  manager if you'd like to reopen it.
                </p>
              </div>
            )}

            {upgrade.status === "completed" && (
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
                <p className="text-sm text-cream/60 mb-2">
                  This upgrade is complete. An invoice has been generated.
                </p>
                <Link
                  to="/client/billing"
                  className="text-xs text-amber hover:text-amber/80 transition-colors"
                >
                  View invoice in Billing →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
