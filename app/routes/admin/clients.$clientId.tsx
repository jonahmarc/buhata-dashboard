import { Link, useLoaderData } from "react-router";
import { ArrowLeft, Globe, Calendar, AlertTriangle } from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getClient, type Client } from "~/services/clients";

interface LoaderData {
  client: Client | null;
  fetchError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { clientId: string };
}): Promise<LoaderData> {
  try {
    const client = await getClient(params.clientId);
    return { client, fetchError: false };
  } catch {
    return { client: null, fetchError: true };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const name = data?.client?.business_name ?? "Client";
  return [{ title: `${name} — Buhata Admin` }];
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

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

export default function ClientDetailPage() {
  const { client, fetchError } = useLoaderData() as LoaderData;

  return (
    <div>
      <Topbar
        title={client?.business_name ?? "Client Detail"}
        subtitle={client?.domain}
        actions={
          <Link to="/admin/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Clients
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4 max-w-2xl">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {client === null
              ? "Client not found or you don't have access."
              : "Could not reach the API."}
          </div>
        )}

        {client && (
          <>
            {/* Summary card */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-cream">
                    {client.business_name}
                  </h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-cream/40">
                    <Globe className="h-3.5 w-3.5" />
                    {client.domain}
                  </div>
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
                  label="Onboarding Started"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-cream/30" />
                      {formatDate(client.onboarding_started_at)}
                    </span>
                  }
                />
                <DetailRow
                  label="Finalization Completed"
                  value={formatDate(client.finalization_completed_at)}
                />
                <DetailRow
                  label="Build Clock Started"
                  value={formatDate(client.build_clock_started_at)}
                />
                <DetailRow label="Went Live" value={formatDate(client.live_at)} />
                {client.cancelled_at && (
                  <DetailRow
                    label="Cancelled"
                    value={
                      <span className="text-terracotta">
                        {formatDate(client.cancelled_at)}
                      </span>
                    }
                  />
                )}
              </div>
            </div>

            {/* Placeholder sections — to be implemented in later phases */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 text-center">
              <p className="text-xs text-cream/30">
                Tickets, usage, billing, and onboarding details coming in the
                next phase.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
