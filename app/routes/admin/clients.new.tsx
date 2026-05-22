import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Info } from "lucide-react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { createClient } from "~/services/clients";

// HTML <select> always yields a string, so we keep tier as a string in the
// form and coerce to number in onSubmit. Zod validates the string is one of
// the valid tier values.
const schema = z.object({
  business_name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(120, "Business name is too long"),
  domain: z
    .string()
    .min(3, "Enter a valid domain")
    .regex(
      /^(?!https?:\/\/)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Enter a bare domain (e.g. example.com — no https://)"
    ),
  tier: z.string().refine((v) => ["1", "2", "3", "4", "5"].includes(v), {
    message: "Select a valid service tier",
  }),
  billing_cycle: z.enum(["monthly", "annual"]),
});

type FormData = z.infer<typeof schema>;

const TIER_INFO = [
  { value: 1, label: "Tier 1 — Starter", quota: "5 updates / mo", note: "No new-functionality upgrades." },
  { value: 2, label: "Tier 2 — Basic", quota: "12 updates / mo", note: null },
  { value: 3, label: "Tier 3 — Standard", quota: "22 updates / mo", note: null },
  { value: 4, label: "Tier 4 — Pro", quota: "36 updates / mo", note: null },
  { value: 5, label: "Tier 5 — Enterprise", quota: "80 dev hrs / mo", note: "Billed by dev hours, not update count." },
] as const;

export function meta() {
  return [{ title: "Add Client — Buhata Admin" }];
}

export default function NewClientPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tier: "1", billing_cycle: "monthly" },
  });

  const selectedTier = Number(watch("tier"));
  const tierInfo = TIER_INFO.find((t) => t.value === selectedTier);

  const onSubmit = async (data: FormData) => {
    try {
      await createClient({ ...data, tier: Number(data.tier) });
      navigate("/admin/clients");
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail;
      const detail = Array.isArray(raw)
        ? (raw as { msg: string }[]).map((e) => e.msg).join(", ")
        : typeof raw === "string"
        ? raw
        : "Failed to create client. Please try again.";
      setError("root", { message: detail });
    }
  };

  return (
    <div>
      <Topbar
        title="Add Client"
        subtitle="Create a new client account"
        actions={
          <Link to="/admin/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-lg space-y-4"
        >
          {/* Business info */}
          <section className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-cream">
                Business Information
              </h2>
              <p className="mt-0.5 text-xs text-cream/40">
                Basic details about the client.
              </p>
            </div>

            <Input
              label="Business Name"
              placeholder="Acme Corp"
              autoFocus
              {...register("business_name")}
              error={errors.business_name?.message}
            />
            <Input
              label="Domain"
              placeholder="acme.com"
              hint="Client's website domain — no https://"
              {...register("domain")}
              error={errors.domain?.message}
            />
          </section>

          {/* Plan details */}
          <section className="rounded-xl border border-cream/5 bg-navy/10 p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-cream">Plan Details</h2>
              <p className="mt-0.5 text-xs text-cream/40">
                Service tier and billing frequency.
              </p>
            </div>

            <Select
              label="Service Tier"
              {...register("tier")}
              error={errors.tier?.message}
            >
              {TIER_INFO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} · {t.quota}
                </option>
              ))}
            </Select>

            {tierInfo && (
              <div className="flex gap-2.5 rounded-lg border border-amber/12 bg-amber/5 px-3.5 py-3">
                <Info className="mt-px h-3.5 w-3.5 shrink-0 text-amber/70" />
                <p className="text-xs text-amber/80 leading-relaxed">
                  <span className="font-medium">{tierInfo.quota}</span> included.
                  {tierInfo.note && ` ${tierInfo.note}`}
                  {tierInfo.value < 5 &&
                    " Overage billed as upgrade requests at $10/hr."}
                </p>
              </div>
            )}

            {/* Billing cycle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-cream/80">
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["monthly", "annual"] as const).map((cycle) => (
                  <label
                    key={cycle}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-cream/10 bg-navy/20 p-4 transition-colors hover:border-cream/20 has-checked:border-amber/40 has-checked:bg-amber/5"
                  >
                    <input
                      type="radio"
                      value={cycle}
                      {...register("billing_cycle")}
                      className="mt-0.5 accent-amber shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-cream capitalize">
                        {cycle}
                      </p>
                      <p className="mt-0.5 text-xs text-cream/40">
                        {cycle === "monthly"
                          ? "Billed every 30 days"
                          : "Billed annually · 2 months free"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.billing_cycle && (
                <p className="text-xs text-terracotta">
                  {errors.billing_cycle.message}
                </p>
              )}
            </div>
          </section>

          {errors.root && (
            <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
              {errors.root.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={isSubmitting}>
              Create Client
            </Button>
            <Link to="/admin/clients">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
