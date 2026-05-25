import { redirect, useLoaderData, useNavigate } from "react-router";
import { Link } from "react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { getStoredAuth } from "~/stores/authStore";
import { getTickets, type Ticket } from "~/services/tickets";
import { createUpgrade } from "~/services/upgrades";

interface LoaderData {
  tickets: Ticket[];
}

export async function clientLoader(): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  try {
    const result = await getTickets({ page_size: 50 });
    return { tickets: result.items.filter((t) => t.status !== "closed") };
  } catch {
    return { tickets: [] };
  }
}

export function meta() {
  return [{ title: "Request Upgrade — Buhata" }];
}

export default function ClientUpgradeNewPage() {
  const { tickets } = useLoaderData() as LoaderData;
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const upgrade = await createUpgrade({
        description: description.trim(),
        ticket_id: ticketId || undefined,
      });
      navigate(`/client/upgrades/${upgrade.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setError(msg ?? "Could not submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Topbar
        title="Request an Upgrade"
        subtitle="Describe the work you need done"
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
        <div className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">
                  Describe the upgrade <span className="text-terracotta">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  required
                  placeholder="What would you like us to build or change? Please be as specific as possible — include any design references, functionality requirements, or constraints."
                  className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2.5 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-cream/30">
                  Our team will review and provide a scope estimate (complexity class + hours).
                </p>
              </div>

              {/* Optional ticket link */}
              <div>
                <label className="block text-xs font-medium text-cream/60 mb-1.5">
                  Link to existing ticket{" "}
                  <span className="text-cream/30">(optional)</span>
                </label>
                <select
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">No linked ticket</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={loading} disabled={!description.trim()}>
                Submit Request
              </Button>
              <Link to="/client/upgrades">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
