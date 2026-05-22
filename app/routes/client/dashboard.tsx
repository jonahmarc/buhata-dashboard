import { redirect, useLoaderData } from "react-router";
import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Ticket,
  Plus,
  CalendarClock,
} from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import { getCurrentUsage, type Usage } from "~/services/clients";
import { getBillingStatus, type BillingStatus } from "~/services/billing";
import { getTickets, type Ticket as TicketItem } from "~/services/tickets";
import { cn } from "~/lib/utils";

interface DashboardData {
  clientId: string;
  usage: Usage | null;
  billing: BillingStatus | null;
  recentTickets: TicketItem[];
  openTicketCount: number;
  errors: string[];
}

export async function clientLoader(): Promise<DashboardData | Response> {
  const auth = getStoredAuth();

  if (!auth?.token || !auth?.user || auth.user.role !== "client") {
    return redirect("/login");
  }

  const clientId = auth.user.client_id;
  if (!clientId) {
    // client_id missing — backend /auth/me hasn't been updated yet or account issue
    return {
      clientId: "",
      usage: null,
      billing: null,
      recentTickets: [],
      openTicketCount: 0,
      errors: [
        "Your account is not linked to a client record. Please contact support.",
      ],
    };
  }

  const errors: string[] = [];

  const [usage, billing, tickets] = await Promise.allSettled([
    getCurrentUsage(clientId),
    getBillingStatus(clientId),
    getTickets({ page_size: 5 }),
  ]);

  return {
    clientId,
    usage: usage.status === "fulfilled" ? usage.value : null,
    billing: billing.status === "fulfilled" ? billing.value : null,
    recentTickets:
      tickets.status === "fulfilled" ? tickets.value.items : [],
    openTicketCount:
      tickets.status === "fulfilled"
        ? tickets.value.items.filter(
            (t) => t.status === "open" || t.status === "acknowledged" || t.status === "in_progress"
          ).length
        : 0,
    errors: [
      ...(usage.status === "rejected" ? ["Could not load usage data."] : []),
      ...(billing.status === "rejected"
        ? ["Could not load billing status."]
        : []),
      ...(tickets.status === "rejected" ? ["Could not load tickets."] : []),
      ...errors,
    ],
  };
}

export function meta() {
  return [{ title: "My Dashboard — Buhata" }];
}

// ── Usage Meter ────────────────────────────────────────────────────────────────

function UsageMeterCard({ usage }: { usage: Usage | null }) {
  if (!usage) {
    return (
      <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
        <p className="text-xs text-cream/40">Usage data unavailable.</p>
      </div>
    );
  }

  const isUnlimited = usage.updates_limit === null;
  const pct = isUnlimited
    ? 0
    : Math.min(100, (usage.updates_used / (usage.updates_limit ?? 1)) * 100);

  const barColor =
    pct >= 90
      ? "bg-terracotta"
      : pct >= 70
      ? "bg-amber"
      : "bg-emerald-500";

  const monthName = new Date(
    usage.period_year,
    usage.period_month - 1
  ).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-cream/40 uppercase tracking-wider">
            Monthly Usage
          </p>
          <p className="mt-0.5 text-xs text-cream/30">{monthName}</p>
        </div>
        {isUnlimited ? (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Unlimited
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              pct >= 90
                ? "bg-terracotta/10 text-terracotta"
                : pct >= 70
                ? "bg-amber/10 text-amber"
                : "bg-emerald-500/10 text-emerald-400"
            )}
          >
            {Math.round(pct)}%
          </span>
        )}
      </div>

      {isUnlimited ? (
        <div>
          <p className="text-2xl font-semibold text-cream tabular-nums">
            {usage.updates_used}
          </p>
          <p className="mt-1 text-xs text-cream/40">updates submitted</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-semibold text-cream tabular-nums">
              {usage.updates_used}
            </span>
            <span className="text-sm text-cream/40">
              / {usage.updates_limit} updates
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream/8">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-cream/40">
            {usage.remaining === 0
              ? "No updates remaining this month."
              : `${usage.remaining} update${usage.remaining !== 1 ? "s" : ""} remaining`}
          </p>
        </>
      )}
    </div>
  );
}

// ── Billing Status Card ────────────────────────────────────────────────────────

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

function BillingCard({ billing }: { billing: BillingStatus | null }) {
  if (!billing) {
    return (
      <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
        <p className="text-xs text-cream/40">Billing data unavailable.</p>
      </div>
    );
  }

  const statusConfig = {
    current: {
      label: "Current",
      icon: CheckCircle,
      iconClass: "text-emerald-400",
      bgClass: "bg-emerald-400/10",
    },
    past_due: {
      label: "Past Due",
      icon: AlertTriangle,
      iconClass: "text-amber",
      bgClass: "bg-amber/10",
    },
    deactivation_pending: {
      label: "Action Required",
      icon: AlertTriangle,
      iconClass: "text-terracotta",
      bgClass: "bg-terracotta/10",
    },
    no_invoices: {
      label: "No Invoices",
      icon: CalendarClock,
      iconClass: "text-cream/40",
      bgClass: "bg-cream/5",
    },
  };

  const cfg = statusConfig[billing.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs text-cream/40 uppercase tracking-wider">
          Billing
        </p>
        <div className={cn("rounded-lg p-1.5", cfg.bgClass)}>
          <Icon className={cn("h-4 w-4", cfg.iconClass)} />
        </div>
      </div>

      <p className="text-sm font-semibold text-cream">{cfg.label}</p>

      {billing.current_invoice && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cream/40">Amount due</span>
            <span className="font-medium text-cream">
              {formatAmount(billing.current_invoice.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-cream/40">Due date</span>
            <span className={cn(
              "font-medium",
              billing.days_past_due > 0 ? "text-amber" : "text-cream"
            )}>
              {formatDate(billing.next_due_date)}
            </span>
          </div>
          {billing.days_past_due > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream/40">Days overdue</span>
              <span className="font-medium text-terracotta">
                {billing.days_past_due} day{billing.days_past_due !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {parseFloat(billing.accrued_late_fees) > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream/40">Accrued late fees</span>
              <span className="font-medium text-terracotta">
                {formatAmount(billing.accrued_late_fees)}
              </span>
            </div>
          )}
        </div>
      )}

      {billing.status === "no_invoices" && (
        <p className="mt-2 text-xs text-cream/35 leading-relaxed">
          Your first invoice will appear here once billing starts.
        </p>
      )}
    </div>
  );
}

// ── Open Tickets Card ──────────────────────────────────────────────────────────

function OpenTicketsCard({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-cream/5 bg-navy/10 p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="text-xs text-cream/40 uppercase tracking-wider">
          Open Tickets
        </p>
        <div className="rounded-lg p-1.5 bg-cream/5">
          <Ticket className="h-4 w-4 text-cream/40" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-cream tabular-nums">{count}</p>
      <p className="mt-1 text-xs text-cream/40">
        {count === 0
          ? "No open tickets."
          : `ticket${count !== 1 ? "s" : ""} in progress`}
      </p>
    </div>
  );
}

// ── Ticket Status Helpers ──────────────────────────────────────────────────────

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

function formatTicketStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const data = useLoaderData() as DashboardData;
  const { billing, usage, recentTickets, openTicketCount, errors } = data;

  return (
    <div>
      <Topbar
        title="My Dashboard"
        subtitle="Overview of your account"
        actions={
          <Link to="/client/tickets/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Submit Ticket
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Error messages */}
        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}

        {/* Past-due warning banner — prominent when overdue */}
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

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <UsageMeterCard usage={usage} />
          <BillingCard billing={billing} />
          <OpenTicketsCard count={openTicketCount} />
        </div>

        {/* Recent tickets */}
        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-cream/5">
            <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
              Recent Tickets
            </h2>
            <Link
              to="/client/tickets"
              className="text-xs text-amber hover:text-amber/80 transition-colors"
            >
              View all →
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="py-14 text-center">
              <Ticket className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">No tickets yet.</p>
              <p className="mt-1 text-xs text-cream/25">
                Use "Submit Ticket" to request a content update or get support.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream/5 bg-cream/2">
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Submitted
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="group transition-colors hover:bg-cream/3"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        to="/client/tickets"
                        className="text-sm font-medium text-cream group-hover:text-amber transition-colors"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/40 hidden md:table-cell">
                      {TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant={
                          TICKET_STATUS_VARIANT[ticket.status] ?? "default"
                        }
                      >
                        {formatTicketStatus(ticket.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/30 hidden lg:table-cell">
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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
