import { redirect, useNavigate } from "react-router";
import { Link } from "react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { getStoredAuth } from "~/stores/authStore";
import { createTicket, type TicketType } from "~/services/tickets";

export async function clientLoader(): Promise<null | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");
  return null;
}

export function meta() {
  return [{ title: "Submit Ticket — Buhata" }];
}

const VALID_TYPES: TicketType[] = [
  "content_update",
  "upgrade_request",
  "support",
  "billing",
];

const schema = z.object({
  type: z
    .string()
    .refine((v): v is TicketType => VALID_TYPES.includes(v as TicketType), {
      message: "Please select a ticket type",
    }),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  description: z
    .string()
    .min(10, "Please provide at least 10 characters of detail")
    .max(5000, "Description must be 5000 characters or less"),
});

type FormValues = z.infer<typeof schema>;

export default function SubmitTicketPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "content_update", subject: "", description: "" },
  });

  const description = watch("description");

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      await createTicket({
        type: data.type as TicketType,
        subject: data.subject,
        description: data.description,
      });
      navigate("/client/tickets");
    } catch {
      setSubmitError(
        "Could not submit your ticket. Please check your connection and try again."
      );
    }
  };

  return (
    <div>
      <Topbar
        title="Submit Ticket"
        subtitle="Request a content update or get support"
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
        <div className="max-w-xl">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-5"
          >
            {submitError && (
              <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            <Select
              label="Ticket Type"
              error={errors.type?.message}
              {...register("type")}
            >
              <option value="content_update">Content Update</option>
              <option value="upgrade_request">Upgrade Request</option>
              <option value="support">Support</option>
              <option value="billing">Billing</option>
            </Select>

            <Input
              label="Subject"
              placeholder="Brief summary of your request"
              error={errors.subject?.message}
              {...register("subject")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-cream/80">
                Description
              </label>
              <textarea
                placeholder="Provide as much detail as possible about your request…"
                rows={6}
                className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2.5 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-amber/50 focus:ring-1 focus:ring-amber/20 resize-none"
                {...register("description")}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.description ? (
                  <p className="text-xs text-terracotta">
                    {errors.description.message}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-cream/25 shrink-0">
                  {description?.length ?? 0} / 5000
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Link to="/client/tickets">
                <Button variant="secondary" size="sm" type="button">
                  Cancel
                </Button>
              </Link>
              <Button size="sm" type="submit" loading={isSubmitting}>
                Submit Ticket
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
