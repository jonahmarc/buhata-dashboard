import { redirect, useLoaderData, useRevalidator } from "react-router";
import { Ticket, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getTickets,
  acknowledgeTicket,
  startTicket,
  resolveTicket,
  closeTicket,
  type Ticket as TicketItem,
  type TicketStatus,
} from "~/services/tickets";

interface LoaderData {
  tickets: TicketItem[];
  total: number;
  fetchError: boolean;
}

export async function clientLoader(): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "admin") return redirect("/login");

  try {
    const result = await getTickets({ page_size: 100 });
    return { tickets: result.items, total: result.total, fetchError: false };
  } catch {
    return { tickets: [], total: 0, fetchError: true };
  }
}

export function meta() {
  return [{ title: "Tickets — Buhata Admin" }];
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

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminTicketsPage() {
  const { tickets, total, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered =
    statusFilter === "all"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  async function runAction(
    id: string,
    fn: (id: string) => Promise<TicketItem>
  ) {
    setProcessing(id);
    setActionError(null);
    try {
      await fn(id);
      revalidate();
    } catch {
      setActionError("Action failed. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <Topbar
        title="Tickets"
        subtitle={`${total} ticket${total !== 1 ? "s" : ""} total`}
      />

      <div className="p-6 space-y-4">
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

        <div className="flex justify-end">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TicketStatus | "all")
            }
            className="h-9 rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="rounded-xl border border-cream/5 bg-navy/10 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Ticket className="mx-auto h-8 w-8 text-cream/15 mb-3" />
              <p className="text-sm text-cream/40">
                {tickets.length === 0
                  ? "No tickets yet."
                  : "No tickets match your filter."}
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
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium text-cream/35 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream/5">
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-cream/3"
                  >
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-cream">
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-cream/30 font-mono">
                        {ticket.client_id.slice(0, 8)}
                      </p>
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
                        {formatStatus(ticket.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-cream/30 hidden lg:table-cell">
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {ticket.status === "open" && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={processing === ticket.id}
                            onClick={() =>
                              runAction(ticket.id, acknowledgeTicket)
                            }
                          >
                            Acknowledge
                          </Button>
                        )}
                        {ticket.status === "acknowledged" && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={processing === ticket.id}
                            onClick={() => runAction(ticket.id, startTicket)}
                          >
                            Start
                          </Button>
                        )}
                        {ticket.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={processing === ticket.id}
                            onClick={() => runAction(ticket.id, resolveTicket)}
                          >
                            Resolve
                          </Button>
                        )}
                        {ticket.status === "resolved" && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={processing === ticket.id}
                            onClick={() => runAction(ticket.id, closeTicket)}
                          >
                            Close
                          </Button>
                        )}
                        {ticket.status === "closed" && (
                          <span className="text-xs text-cream/25">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-cream/25 text-right">
            Showing {filtered.length} of {total} tickets
          </p>
        )}
      </div>
    </div>
  );
}
