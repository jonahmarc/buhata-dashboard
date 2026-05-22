import { useLoaderData, useRevalidator } from "react-router";
import { Link } from "react-router";
import { AlertTriangle, CreditCard, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getClients, type Client } from "~/services/clients";
import { reactivateClient } from "~/services/billing";

interface LoaderData {
  clients: Client[];
  fetchError: boolean;
}

export async function clientLoader(): Promise<LoaderData> {
  try {
    const clients = await getClients();
    return { clients, fetchError: false };
  } catch {
    return { clients: [], fetchError: true };
  }
}

export function meta() {
  return [{ title: "Billing — Buhata Admin" }];
}

const STATUS_SORT: Record<Client["status"], number> = {
  deactivated: 0,
  active: 1,
  cancelled: 2,
};

function statusBadgeVariant(
  status: Client["status"]
): "success" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "deactivated") return "danger";
  return "default";
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TIER_LABEL: Record<number, string> = {
  1: "Starter",
  2: "Basic",
  3: "Standard",
  4: "Pro",
  5: "Enterprise",
};

export default function AdminBillingPage() {
  const { clients, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sorted = [...clients].sort(
    (a, b) => (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9)
  );

  const deactivatedCount = clients.filter(
    (c) => c.status === "deactivated"
  ).length;
  const activeCount = clients.filter((c) => c.status === "active").length;

  async function handleReactivate(clientId: string) {
    setProcessing(clientId);
    setActionError(null);
    try {
      await reactivateClient(clientId);
      revalidate();
    } catch {
      setActionError("Reactivation failed. Make sure the client's balance is cleared first.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <Topbar
        title="Billing"
        subtitle="Manage client invoices and account standing"
      />

      <div className="p-6 space-y-5">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not reach the API. Check that the backend server is running.
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
            <p className="text-xs text-cream/40">Total Clients</p>
            <p className="mt-1.5 text-2xl font-semibold text-cream tabular-nums">
              {clients.length}
            </p>
          </div>
          <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
            <p className="text-xs text-cream/40">Active</p>
            <p className="mt-1.5 text-2xl font-semibold text-emerald-400 tabular-nums">
              {activeCount}
            </p>
          </div>
          <div className="rounded-xl border border-terracotta/10 bg-terracotta/5 p-5">
            <p className="text-xs text-terracotta/60">Deactivated</p>
            <p className="mt-1.5 text-2xl font-semibold text-terracotta tabular-nums">
              {deactivatedCount}
            </p>
          </div>
          <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
            <p className="text-xs text-cream/40">Cancelled</p>
            <p className="mt-1.5 text-2xl font-semibold text-cream/50 tabular-nums">
              {clients.filter((c) => c.status === "cancelled").length}
            </p>
          </div>
        </div>

        {deactivatedCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-terracotta/20 bg-terracotta/8 px-5 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-terracotta mt-px" />
            <div>
              <p className="text-sm font-semibold text-terracotta">
                {deactivatedCount} client
                {deactivatedCount !== 1 ? "s" : ""} need attention
              </p>
              <p className="mt-0.5 text-xs text-terracotta/70">
                Mark their invoices as paid first, then use the Reactivate
                button below.
              </p>
            </div>
          </div>
        )}

        {/* Client billing table */}
        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-cream/5">
            <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
              All Clients
            </h2>
          </div>

          {sorted.length === 0 ? (
            <div className="py-14 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">No clients yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5 bg-cream/2">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden md:table-cell">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden lg:table-cell">
                    Billing
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {sorted.map((client) => (
                  <tr
                    key={client.id}
                    className="group transition-colors hover:bg-cream/3"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        to={`/admin/clients/${client.id}`}
                        className="text-sm font-medium text-cream group-hover:text-amber transition-colors"
                      >
                        {client.business_name}
                      </Link>
                      {client.domain && (
                        <p className="text-xs text-cream/30 mt-0.5">
                          {client.domain}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/50 hidden md:table-cell">
                      Tier {client.tier} — {TIER_LABEL[client.tier] ?? ""}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 capitalize hidden lg:table-cell">
                      {client.billing_cycle}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusBadgeVariant(client.status)}>
                        {formatStatus(client.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        {client.status === "deactivated" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={processing === client.id}
                            onClick={() => handleReactivate(client.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reactivate
                          </Button>
                        )}
                        <Link to={`/admin/clients/${client.id}`}>
                          <Button size="sm" variant="primary">
                            Manage
                          </Button>
                        </Link>
                      </div>
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
