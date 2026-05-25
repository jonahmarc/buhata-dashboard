import { Link, useLoaderData } from "react-router";
import {
  Users,
  TicketCheck,
  AlertTriangle,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getClients, type Client } from "~/services/clients";

interface DashboardData {
  clients: Client[];
  fetchError: boolean;
}

export async function clientLoader(): Promise<DashboardData> {
  try {
    const clients = await getClients();
    return { clients, fetchError: false };
  } catch {
    return { clients: [], fetchError: true };
  }
}

export function meta() {
  return [{ title: "Dashboard — Buhata Admin" }];
}

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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "default" | "success" | "warning" | "info" | "danger";
}) {
  const colors = {
    default: { bg: "bg-cream/5", icon: "text-cream/40" },
    success: { bg: "bg-emerald-400/10", icon: "text-emerald-400" },
    warning: { bg: "bg-amber/10", icon: "text-amber" },
    info: { bg: "bg-blue-400/10", icon: "text-blue-400" },
    danger: { bg: "bg-terracotta/10", icon: "text-terracotta" },
  };

  return (
    <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-cream/40">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-cream tabular-nums">
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${colors[color].bg}`}>
          <Icon className={`h-5 w-5 ${colors[color].icon}`} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { clients, fetchError } = useLoaderData() as DashboardData;

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    deactivated: clients.filter((c) => c.status === "deactivated").length,
    cancelled: clients.filter((c) => c.status === "cancelled").length,
  };

  const recentClients = [...clients]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Overview of your operations"
        actions={
          <Link to="/admin/clients/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Client
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not reach the API. Check that the backend server is running.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Clients"
            value={stats.total}
            icon={Users}
            color="default"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={TrendingUp}
            color="success"
          />
          <StatCard
            label="Deactivated"
            value={stats.deactivated}
            icon={TicketCheck}
            color="warning"
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={AlertTriangle}
            color="danger"
          />
        </div>

        {/* Recent clients */}
        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-cream/5">
            <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
              Recent Clients
            </h2>
            <Link
              to="/admin/clients"
              className="text-xs text-amber hover:text-amber/80 transition-colors"
            >
              View all →
            </Link>
          </div>

          {recentClients.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">No clients yet.</p>
              <Link to="/admin/clients/new">
                <Button variant="secondary" size="sm" className="mt-4">
                  Add your first client
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {recentClients.map((client) => (
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
