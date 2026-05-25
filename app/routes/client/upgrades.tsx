import { redirect, useLoaderData, Link } from "react-router";
import { Wrench, AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getUpgrades,
  type UpgradeRequest,
  type UpgradeStatus,
} from "~/services/upgrades";

interface LoaderData {
  upgrades: UpgradeRequest[];
  total: number;
  fetchError: boolean;
}

export async function clientLoader(): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  try {
    const result = await getUpgrades({ page_size: 50 });
    return { upgrades: result.items, total: result.total, fetchError: false };
  } catch {
    return { upgrades: [], total: 0, fetchError: true };
  }
}

export function meta() {
  return [{ title: "My Upgrades — Buhata" }];
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

export default function ClientUpgradesPage() {
  const { upgrades, total, fetchError } = useLoaderData() as LoaderData;
  const [statusFilter, setStatusFilter] = useState<UpgradeStatus | "all">("all");

  const filtered =
    statusFilter === "all"
      ? upgrades
      : upgrades.filter((u) => u.status === statusFilter);

  const pendingApproval = upgrades.filter(
    (u) => u.status === "awaiting_approval"
  ).length;

  return (
    <div>
      <Topbar
        title="My Upgrades"
        subtitle={`${total} request${total !== 1 ? "s" : ""} total`}
        actions={
          <Link to="/client/upgrades/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Request Upgrade
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {fetchError && (
          <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            Could not load upgrades. Check that the backend server is running.
          </div>
        )}

        {pendingApproval > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber/20 bg-amber/8 px-4 py-3 text-xs text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendingApproval} upgrade request{pendingApproval !== 1 ? "s" : ""} awaiting your approval.
          </div>
        )}

        <div className="flex justify-end">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as UpgradeStatus | "all")
            }
            className="h-9 rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="pending_scope">Pending Scope</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">
                {upgrades.length === 0
                  ? "No upgrade requests yet."
                  : "No requests match your filter."}
              </p>
              {upgrades.length === 0 && (
                <Link to="/client/upgrades/new">
                  <Button variant="secondary" size="sm" className="mt-4">
                    Request your first upgrade
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5 bg-cream/2">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden md:table-cell">
                    Est. Cost
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden lg:table-cell">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {filtered.map((upgrade) => (
                  <tr
                    key={upgrade.id}
                    className="hover:bg-cream/3 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        to={`/client/upgrades/${upgrade.id}`}
                        className="group"
                      >
                        <p className="text-sm font-medium text-cream group-hover:text-amber transition-colors">
                          {upgrade.description.length > 70
                            ? upgrade.description.slice(0, 70) + "…"
                            : upgrade.description}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/60 hidden md:table-cell">
                      {formatAmount(upgrade.estimated_cost)}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={STATUS_VARIANT[upgrade.status] ?? "default"}>
                        {formatStatus(upgrade.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/30 hidden lg:table-cell">
                      {new Date(upgrade.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-cream/25 text-right">
            Showing {filtered.length} of {total}
          </p>
        )}
      </div>
    </div>
  );
}
