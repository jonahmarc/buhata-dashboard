import { Link, redirect, useLoaderData, useRevalidator } from "react-router";
import { ArrowLeft, AlertTriangle, MessageSquare, User, Clock } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { getStoredAuth } from "~/stores/authStore";
import {
  getTicket,
  getComments,
  addComment,
  type Ticket,
  type Comment,
} from "~/services/tickets";

interface LoaderData {
  ticket: Ticket | null;
  comments: Comment[];
  fetchError: boolean;
}

export async function clientLoader({
  params,
}: {
  params: { ticketId: string };
}): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  try {
    const [ticket, comments] = await Promise.all([
      getTicket(params.ticketId),
      getComments(params.ticketId),
    ]);
    return { ticket, comments, fetchError: false };
  } catch {
    return { ticket: null, comments: [], fetchError: true };
  }
}

export function meta({ data }: { data: LoaderData }) {
  const subject = data?.ticket?.subject ?? "Ticket";
  return [{ title: `${subject} — Buhata` }];
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

export default function ClientTicketDetailPage() {
  const { ticket, comments, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Clients only see public (non-internal) comments
  const publicComments = comments.filter((c) => !c.is_internal);

  async function handleReply() {
    if (!ticket || !replyBody.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      await addComment(ticket.id, { body: replyBody.trim() });
      setReplyBody("");
      revalidate();
    } catch {
      setReplyError("Could not post comment. Please try again.");
    } finally {
      setReplying(false);
    }
  }

  return (
    <div>
      <Topbar
        title={ticket?.subject ?? "Ticket Detail"}
        subtitle={
          ticket
            ? TICKET_TYPE_LABELS[ticket.type] ?? ticket.type
            : undefined
        }
        actions={
          <Link to="/client/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              My Tickets
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

        {ticket && (
          <div className="max-w-2xl space-y-4">
            {/* Ticket info card */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
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
                {ticket.sla_due_at &&
                  (ticket.status === "acknowledged" ||
                    ticket.status === "in_progress") && (
                    <DetailRow
                      label="Expected by"
                      value={
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber/70" />
                          {new Date(ticket.sla_due_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      }
                    />
                  )}
                {ticket.resolved_at && (
                  <DetailRow
                    label="Resolved"
                    value={new Date(ticket.resolved_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  />
                )}
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
                  ({publicComments.length})
                </span>
              </div>

              {publicComments.length === 0 ? (
                <p className="text-sm text-cream/30 py-4 text-center">
                  No comments yet. Our team will respond here.
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  {publicComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-cream/5 bg-navy/20 p-3"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <User className="h-3 w-3 text-cream/30" />
                        <span className="text-xs text-cream/40 font-mono">
                          {comment.user_id.slice(0, 8)}
                        </span>
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

              {/* Reply form — hidden for closed tickets */}
              {ticket.status !== "closed" && (
                <div className="space-y-2 pt-3 border-t border-cream/5">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    placeholder="Add a comment or provide more details…"
                    className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors resize-none"
                  />
                  {replyError && (
                    <p className="text-xs text-terracotta">{replyError}</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      loading={replying}
                      disabled={!replyBody.trim()}
                      onClick={handleReply}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
