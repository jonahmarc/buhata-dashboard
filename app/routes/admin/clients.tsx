import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { Plus, Search, Users } from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getClients, type Client } from "~/services/clients";

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
  return [{ title: "Clients — Buhata Admin" }];
}

function statusBadgeVariant(
  status: Client["status"]
): "success" | "info" | "warning" | "danger" | "default" {
  const map = {
    active: "success",
    onboarding: "info",
    past_due: "warning",
    deactivated: "danger",
    cancelled: "danger",
  } as const;
  return map[status] ?? "default";
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ClientsPage() {
  const { clients, fetchError } = useLoaderData() as LoaderData;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Client["status"] | "all">(
    "all"
  );

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.business_name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <Topbar
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? "s" : ""} total`}
        actions={
          <Link to="/admin/clients/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Client
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {fetchError && (
          <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            Could not reach the API. Check that the backend server is running.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/30" />
            <input
              type="text"
              placeholder="Search by name or domain…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 pl-8 pr-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as Client["status"] | "all")
            }
            className="h-9 rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="deactivated">Deactivated</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">
                {clients.length === 0
                  ? "No clients yet."
                  : "No clients match your filters."}
              </p>
              {clients.length === 0 && (
                <Link to="/admin/clients/new">
                  <Button variant="secondary" size="sm" className="mt-4">
                    Add your first client
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5 bg-cream/2">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden md:table-cell">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden lg:table-cell">
                    Billing
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden xl:table-cell">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {filtered.map((client) => (
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
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 hidden md:table-cell">
                      {client.domain}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/60">
                      Tier {client.tier}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 capitalize hidden lg:table-cell">
                      {client.billing_cycle}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusBadgeVariant(client.status)}>
                        {formatStatus(client.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/30 hidden xl:table-cell">
                      {new Date(client.created_at).toLocaleDateString("en-US", {
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
            Showing {filtered.length} of {clients.length} clients
          </p>
        )}
      </div>
    </div>
  );
}
