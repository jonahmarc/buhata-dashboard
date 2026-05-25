import { Link, redirect, useLoaderData, useRevalidator } from "react-router";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  MessageSquare,
  Lock,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getTicket,
  getComments,
  addComment,
  acknowledgeTicket,
  startTicket,
  resolveTicket,
  closeTicket,
  type Ticket,
  type Comment,
} from "~/services/tickets";
import { getClient, type Client } from "~/services/clients";

interface LoaderData {
  ticket: Ticket | null;
  comments: Comment[];
  client: Client | null;
  fetchError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { ticketId: string };
}): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "admin") return redirect("/login");

  try {
    const ticket = await getTicket(params.ticketId);
    const [commentsResult, clientResult] = await Promise.allSettled([
      getComments(params.ticketId),
      getClient(ticket.client_id),
    ]);
    return {
      ticket,
      comments: commentsResult.status === "fulfilled" ? commentsResult.value : [],
      client: clientResult.status === "fulfilled" ? clientResult.value : null,
      fetchError: false,
    };
  } catch {
    return { ticket: null, comments: [], client: null, fetchError: true };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const subject = data?.ticket?.subject ?? "Ticket";
  return [{ title: `${subject} — Buhata Admin` }];
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

function SlaCountdown({ sla_due_at }: { sla_due_at: string }) {
  const [minutesLeft, setMinutesLeft] = useState(() =>
    Math.floor((new Date(sla_due_at).getTime() - Date.now()) / 60000)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMinutesLeft(
        Math.floor((new Date(sla_due_at).getTime() - Date.now()) / 60000)
      );
    }, 60000);
    return () => clearInterval(id);
  }, [sla_due_at]);

  const breached = minutesLeft < 0;
  const urgent = !breached && minutesLeft <= 120;

  const abs = Math.abs(minutesLeft);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        breached
          ? "border border-terracotta/20 bg-terracotta/8 text-terracotta"
          : urgent
          ? "border border-amber/20 bg-amber/8 text-amber"
          : "border border-cream/10 bg-cream/3 text-cream/60"
      }`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {breached
        ? `SLA breached ${label} ago`
        : `SLA due in ${label}`}
    </div>
  );
}

export default function AdminTicketDetailPage() {
  const { ticket, comments, client, fetchError } =
    useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  async function runAction(fn: (id: string) => Promise<Ticket>) {
    if (!ticket) return;
    setProcessing(true);
    setActionError(null);
    try {
      await fn(ticket.id);
      revalidate();
    } catch {
      setActionError("Action failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReply() {
    if (!ticket || !replyBody.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      await addComment(ticket.id, {
        body: replyBody.trim(),
        is_internal: isInternal,
      });
      setReplyBody("");
      setIsInternal(false);
      revalidate();
    } catch {
      setReplyError("Could not post comment. Please try again.");
    } finally {
      setReplying(false);
    }
  }

  const showSla =
    ticket?.sla_due_at &&
    (ticket.status === "acknowledged" || ticket.status === "in_progress");

  return (
    <div>
      <Topbar
        title={ticket?.subject ?? "Ticket Detail"}
        subtitle={
          ticket ? `${TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}` : undefined
        }
        actions={
          <Link to="/admin/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Tickets
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {ticket === null
              ? "Ticket not found or you don't have access."
              : "Could not reach the API."}
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        {ticket && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left column — ticket info + comments */}
            <div className="space-y-4">
              {/* Ticket info card */}
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <h2 className="text-base font-semibold text-cream leading-snug">
                    {ticket.subject}
                  </h2>
                  <Badge
                    variant={TICKET_STATUS_VARIANT[ticket.status] ?? "default"}
                  >
                    {formatStatus(ticket.status)}
                  </Badge>
                </div>

                <p className="text-sm text-cream/60 mb-5 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>

                <div>
                  <DetailRow
                    label="Type"
                    value={TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
                  />
                  <DetailRow
                    label="Submitted"
                    value={new Date(ticket.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  />
                  {ticket.resolved_at && (
                    <DetailRow
                      label="Resolved"
                      value={new Date(ticket.resolved_at).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    />
                  )}
                  <DetailRow
                    label="Ticket ID"
                    value={
                      <span className="font-mono text-xs text-cream/50">
                        {ticket.id}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* Comments */}
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4 text-cream/40" />
                  <h3 className="text-xs font-semibold text-cream uppercase tracking-wider">
                    Comments
                  </h3>
                  <span className="text-xs text-cream/30">
                    ({comments.length})
                  </span>
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-cream/30 py-4 text-center">
                    No comments yet.
                  </p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-lg border p-3 ${
                          comment.is_internal
                            ? "border-amber/15 bg-amber/5"
                            : "border-cream/5 bg-navy/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="h-3 w-3 text-cream/30" />
                          <span className="text-xs text-cream/40 font-mono">
                            {comment.user_id.slice(0, 8)}
                          </span>
                          {comment.is_internal && (
                            <span className="flex items-center gap-1 text-[10px] text-amber/70 font-medium">
                              <Lock className="h-2.5 w-2.5" />
                              Internal
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-cream/25">
                            {new Date(comment.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-cream/80 whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {ticket.status !== "closed" && (
                  <div className="space-y-2 pt-3 border-t border-cream/5">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={3}
                      placeholder="Write a comment…"
                      className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors resize-none"
                    />
                    {replyError && (
                      <p className="text-xs text-terracotta">{replyError}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded border-cream/20 bg-navy/40 text-amber focus:ring-amber/30"
                        />
                        <span className="flex items-center gap-1 text-xs text-cream/50">
                          <Lock className="h-3 w-3" />
                          Internal note
                        </span>
                      </label>
                      <Button
                        size="sm"
                        loading={replying}
                        disabled={!replyBody.trim()}
                        onClick={handleReply}
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column — actions + client info */}
            <div className="space-y-4">
              {/* Actions card */}
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-4">
                <h3 className="text-xs font-semibold text-cream uppercase tracking-wider">
                  Actions
                </h3>

                {showSla && (
                  <SlaCountdown sla_due_at={ticket.sla_due_at!} />
                )}

                <div className="flex flex-wrap gap-2">
                  {ticket.status === "open" && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={processing}
                      onClick={() => runAction(acknowledgeTicket)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {ticket.status === "acknowledged" && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={processing}
                      onClick={() => runAction(startTicket)}
                    >
                      Start Work
                    </Button>
                  )}
                  {ticket.status === "in_progress" && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={processing}
                      onClick={() => runAction(resolveTicket)}
                    >
                      Resolve
                    </Button>
                  )}
                  {ticket.status === "resolved" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={processing}
                      onClick={() => runAction(closeTicket)}
                    >
                      Close
                    </Button>
                  )}
                  {ticket.status === "closed" && (
                    <p className="text-xs text-cream/30">
                      This ticket is closed.
                    </p>
                  )}
                </div>
              </div>

              {/* Client info card */}
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
                  <DetailRow
                    label="Tier"
                    value={`Tier ${client.tier}`}
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <Badge
                        variant={
                          client.status === "active"
                            ? "success"
                            : client.status === "onboarding"
                            ? "info"
                            : "danger"
                        }
                      >
                        {formatStatus(client.status)}
                      </Badge>
                    }
                  />
                </div>
              )}

              {/* Timestamps card */}
              <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
                <h3 className="text-xs font-semibold text-cream uppercase tracking-wider mb-4">
                  Timeline
                </h3>
                <DetailRow
                  label="Created"
                  value={new Date(ticket.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                />
                {ticket.sla_acknowledged_at && (
                  <DetailRow
                    label="Acknowledged"
                    value={new Date(
                      ticket.sla_acknowledged_at
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  />
                )}
                {ticket.sla_due_at && (
                  <DetailRow
                    label="SLA Due"
                    value={new Date(ticket.sla_due_at).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  />
                )}
                {ticket.resolved_at && (
                  <DetailRow
                    label="Resolved"
                    value={new Date(ticket.resolved_at).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
